import { type GithubCheckVersionResponse } from "../types/github-check-version";

export async function CheckVersion() {
  await fetch(
    "https://api.github.com/repos/opticalsecurity/unipm/releases/latest",
    {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
      },
    }
  ).then(async (data) => {
    const response: GithubCheckVersionResponse =
      (await data.json()) as GithubCheckVersionResponse;

    const latestVersion = response.tag_name;

    console.log(`Latest version: ${latestVersion}`);
  });
}
