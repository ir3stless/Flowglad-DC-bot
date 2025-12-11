export interface GitHubPullRequestEvent {
  action: string;
  pull_request: {
    merged: boolean;
    html_url: string;
    title: string;
    number: number;
    user: { login: string };
    base: {
      ref: string;
      repo: { full_name: string };
    };
  };
  repository: {
    full_name: string;
  };
  sender: {
    login: string;
  };
}

export function isMergedPullRequestEvent(body: any): body is GitHubPullRequestEvent {
  return (
    body &&
    body.action === "closed" &&
    body.pull_request &&
    body.pull_request.merged === true &&
    typeof body.pull_request.html_url === "string"
  );
}