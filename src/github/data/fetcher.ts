import { execFileSync } from "child_process";
import type { Octokits } from "../api/client";
import {
  isIssueCommentEvent,
  isPullRequestReviewEvent,
  isPullRequestReviewCommentEvent,
  type ParsedGitHubContext,
} from "../context";
import type {
  GitHubComment,
  GitHubFile,
  GitHubIssue,
  GitHubPullRequest,
  GitHubReview,
  GitHubReviewComment,
  GitHubCommit,
} from "../types";
import type { CommentWithImages } from "../utils/image-downloader";
import { downloadCommentImages } from "../utils/image-downloader";

export function extractTriggerTimestamp(
  context: ParsedGitHubContext,
): string | undefined {
  if (isIssueCommentEvent(context)) {
    return context.payload.comment.created_at || undefined;
  } else if (isPullRequestReviewEvent(context)) {
    return context.payload.review.submitted_at || undefined;
  } else if (isPullRequestReviewCommentEvent(context)) {
    return context.payload.comment.created_at || undefined;
  }
  return undefined;
}

export function filterCommentsToTriggerTime<
  T extends { createdAt: string; updatedAt?: string; lastEditedAt?: string },
>(comments: T[], triggerTime: string | undefined): T[] {
  if (!triggerTime) return comments;
  const triggerTimestamp = new Date(triggerTime).getTime();
  return comments.filter((comment) => {
    const createdTimestamp = new Date(comment.createdAt).getTime();
    if (createdTimestamp >= triggerTimestamp) return false;
    const lastEditTime = comment.lastEditedAt || comment.updatedAt;
    if (lastEditTime) {
      const lastEditTimestamp = new Date(lastEditTime).getTime();
      if (lastEditTimestamp >= triggerTimestamp) return false;
    }
    return true;
  });
}

export function filterReviewsToTriggerTime<
  T extends { submittedAt: string; updatedAt?: string; lastEditedAt?: string },
>(reviews: T[], triggerTime: string | undefined): T[] {
  if (!triggerTime) return reviews;
  const triggerTimestamp = new Date(triggerTime).getTime();
  return reviews.filter((review) => {
    const submittedTimestamp = new Date(review.submittedAt).getTime();
    if (submittedTimestamp >= triggerTimestamp) return false;
    const lastEditTime = review.lastEditedAt || review.updatedAt;
    if (lastEditTime) {
      const lastEditTimestamp = new Date(lastEditTime).getTime();
      if (lastEditTimestamp >= triggerTimestamp) return false;
    }
    return true;
  });
}

type FetchDataParams = {
  octokits: Octokits;
  repository: string;
  prNumber: string;
  isPR: boolean;
  triggerUsername?: string;
  triggerTime?: string;
};

export type GitHubFileWithSHA = GitHubFile & {
  sha: string;
};

export type FetchDataResult = {
  contextData: GitHubPullRequest | GitHubIssue;
  comments: GitHubComment[];
  changedFiles: GitHubFile[];
  changedFilesWithSHA: GitHubFileWithSHA[];
  reviewData: { nodes: GitHubReview[] } | null;
  imageUrlMap: Map<string, string>;
  triggerDisplayName?: string | null;
};

function mapComment(c: {
  id: number;
  body?: string | null;
  user?: { login: string };
  created_at: string;
  updated_at?: string;
}): GitHubComment {
  return {
    id: String(c.id),
    databaseId: String(c.id),
    body: c.body || "",
    author: { login: c.user?.login || "unknown" },
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    isMinimized: false,
  };
}

function mapReview(r: any): GitHubReview {
  const user = r.user || r.reviewer || { login: "unknown" };
  const rawComments: any[] = r.comments || [];
  return {
    id: String(r.id),
    databaseId: String(r.id),
    author: { login: user.login },
    body: r.body || "",
    state: r.state || "COMMENTED",
    submittedAt: r.submitted_at || r.created_at || "",
    comments: {
      nodes: rawComments.map((rc: any) => {
        const rcUser = rc.user || { login: user.login };
        return {
          id: String(rc.id),
          databaseId: String(rc.id),
          body: rc.body || "",
          path: rc.path || "",
          line: rc.line ?? rc.line_num ?? null,
          author: { login: rcUser.login },
          createdAt: rc.created_at || r.submitted_at || "",
          updatedAt: rc.updated_at,
          isMinimized: false,
        } as GitHubReviewComment;
      }),
    },
  };
}

function mapFile(f: any): GitHubFile {
  return {
    path: f.filename || f.path,
    additions: f.additions || 0,
    deletions: f.deletions || 0,
    changeType: (f.status || "modified").toUpperCase(),
  };
}

export async function fetchGitHubData({
  octokits,
  repository,
  prNumber,
  isPR,
  triggerUsername,
  triggerTime,
}: FetchDataParams): Promise<FetchDataResult> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'.");
  }

  let contextData: GitHubPullRequest | GitHubIssue | null = null;
  let comments: GitHubComment[] = [];
  let changedFiles: GitHubFile[] = [];
  let reviewData: { nodes: GitHubReview[] } | null = null;

  const { rest } = octokits;
  const num = parseInt(prNumber, 10);

  try {
    if (isPR) {
      const { data: pr } = await rest.pulls.get({ owner, repo, pull_number: num });
      const { data: commits } = await rest.pulls.listCommits({ owner, repo, pull_number: num, per_page: 100 });
      const { data: files } = await rest.pulls.listFiles({ owner, repo, pull_number: num, per_page: 100 });
      const { data: rawComments } = await rest.issues.listComments({ owner, repo, issue_number: num, per_page: 100 });

      let reviews: any[] = [];
      try {
        const { data: rData } = await rest.pulls.listReviews({ owner, repo, pull_number: num, per_page: 100 });
        reviews = rData || [];
      } catch {
        console.warn("PR reviews not available via REST on this server");
      }

      contextData = {
        title: pr.title,
        body: pr.body || "",
        author: { login: pr.user?.login || "unknown" },
        baseRefName: pr.base?.ref || "",
        headRefName: pr.head?.ref || "",
        headRefOid: pr.head?.sha || "",
        createdAt: pr.created_at,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        state: pr.state,
        commits: {
          totalCount: commits.length,
          nodes: commits.map((c: any) => ({
            commit: {
              oid: c.sha,
              message: c.commit?.message || "",
              author: { name: c.commit?.author?.name || "", email: c.commit?.author?.email || "" },
            } as GitHubCommit,
          })),
        },
        files: { nodes: files.map(mapFile) },
        comments: { nodes: rawComments.map(mapComment) },
        reviews: { nodes: reviews.map(mapReview) },
      } as GitHubPullRequest;

      changedFiles = files.map(mapFile);
      comments = filterCommentsToTriggerTime(
        rawComments.map(mapComment),
        triggerTime,
      );
      reviewData = { nodes: reviews.map(mapReview) };
      console.log(`Successfully fetched PR #${prNumber} data`);
    } else {
      const { data: issue } = await rest.issues.get({ owner, repo, issue_number: num });
      const { data: rawComments } = await rest.issues.listComments({ owner, repo, issue_number: num, per_page: 100 });

      contextData = {
        title: issue.title,
        body: issue.body || "",
        author: { login: issue.user?.login || "unknown" },
        createdAt: issue.created_at,
        state: issue.state,
        comments: { nodes: rawComments.map(mapComment) },
      } as GitHubIssue;

      comments = filterCommentsToTriggerTime(
        rawComments.map(mapComment),
        triggerTime,
      );
      console.log(`Successfully fetched issue #${prNumber} data`);
    }
  } catch (error) {
    console.error(`Failed to fetch ${isPR ? "PR" : "issue"} data:`, error);
    throw new Error(`Failed to fetch ${isPR ? "PR" : "issue"} data`);
  }

  let changedFilesWithSHA: GitHubFileWithSHA[] = [];
  if (isPR && changedFiles.length > 0) {
    changedFilesWithSHA = changedFiles.map((file) => {
      if (file.changeType === "DELETED") {
        return { ...file, sha: "deleted" };
      }
      try {
        const sha = execFileSync("git", ["hash-object", file.path], { encoding: "utf-8" }).trim();
        return { ...file, sha };
      } catch (error) {
        console.warn(`Failed to compute SHA for ${file.path}:`, error);
        return { ...file, sha: "unknown" };
      }
    });
  }

  const issueComments: CommentWithImages[] = comments
    .filter((c) => c.body && !c.isMinimized)
    .map((c) => ({ type: "issue_comment" as const, id: c.databaseId, body: c.body }));

  const filteredReviewBodies = reviewData?.nodes
    ? filterReviewsToTriggerTime(reviewData.nodes, triggerTime).filter((r) => r.body)
    : [];

  const reviewBodies: CommentWithImages[] = filteredReviewBodies.map((r) => ({
    type: "review_body" as const,
    id: r.databaseId,
    pullNumber: prNumber,
    body: r.body,
  }));

  const allReviewComments =
    reviewData?.nodes?.flatMap((r) => r.comments?.nodes ?? []) ?? [];
  const filteredReviewComments = filterCommentsToTriggerTime(
    allReviewComments,
    triggerTime,
  );

  const reviewComments: CommentWithImages[] = filteredReviewComments
    .filter((c) => c.body && !c.isMinimized)
    .map((c) => ({ type: "review_comment" as const, id: c.databaseId, body: c.body }));

  const mainBody: CommentWithImages[] = contextData.body
    ? [
        {
          ...(isPR
            ? { type: "pr_body" as const, pullNumber: prNumber, body: contextData.body }
            : { type: "issue_body" as const, issueNumber: prNumber, body: contextData.body }),
        },
      ]
    : [];

  const allComments = [...mainBody, ...issueComments, ...reviewBodies, ...reviewComments];
  const imageUrlMap = await downloadCommentImages(octokits, owner, repo, allComments);

  let triggerDisplayName: string | null | undefined;
  if (triggerUsername) {
    triggerDisplayName = await fetchUserDisplayName(octokits, triggerUsername);
  }

  return {
    contextData,
    comments,
    changedFiles,
    changedFilesWithSHA,
    reviewData,
    imageUrlMap,
    triggerDisplayName,
  };
}

export async function fetchUserDisplayName(
  octokits: Octokits,
  login: string,
): Promise<string | null> {
  try {
    const { data } = await octokits.rest.users.getByUsername({ username: login });
    return data.name || data.full_name || data.login;
  } catch (error) {
    console.warn(`Failed to fetch user display name for ${login}:`, error);
    return null;
  }
}
