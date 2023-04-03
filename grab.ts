import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";

const repoSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  html_url: z.string(),
  stargazers_count: z.number(),
  homepage: z.string().optional().nullable(),
  fork: z.boolean(),
});

type Repo = z.infer<typeof repoSchema>;

console.log("Fetching repos...");
async function* getRepos(): AsyncGenerator<Repo, void, void> {
  let url: string | undefined =
    "https://api.github.com/user/26509014/repos?per_page=100";

  while (url) {
    console.log("Querying", url);

    const res = await fetch(
      url,
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${res.status} ${res.statusText}`,
      );
    }

    const data = await res.json();

    const next = res.headers.get("Link")?.match(/<([^>]+)>; rel="next"/);
    url = next?.[1];

    for (const repo of data) {
      yield repoSchema.parse(repo);
    }
  }
}

const data: Repo[] = [];

for await (const page of getRepos()) {
  data.push(page);
}

const projects = data.filter((repo) => !repo.fork || repo.stargazers_count > 1);
const forks = data.filter((repo) => repo.fork && repo.stargazers_count <= 1);

function sortRepos(
  a: typeof data[number],
  b: typeof data[number],
) {
  const aStars = a.stargazers_count;
  const bStars = b.stargazers_count;
  return bStars - aStars;
}

// sort data by stargazers_count
projects.sort(sortRepos);
forks.sort(sortRepos);

let markdown =
  `# [leodog896.github.io](https://github.com/LeoDog896/leodog896.github.io)

these are auto-generated lists of repositories on my account, mainly for catalogue info.

looking for my website? go to [https://leodog896.com](https://leodog896.com) instead.

## Projects (${projects.length})

> **Note**
> Forks with more than 1 star are included in this list
> This is because a few forks are permenant forks of other projects.
`;

for (const repo of projects) {
  const { name, description, html_url, stargazers_count, homepage } = repo;

  markdown += `- [${name} (${stargazers_count})](${html_url}) ${
    homepage ? `([homepage](${homepage}))` : ``
  } - ${description || "No description provided."}\n`;
}

markdown += `
## Forks (${forks.length})

> **Note**
> I have forked a lot of projects for OSS contributions.

`;

for (const repo of forks) {
  const { name, description, html_url, homepage } = repo;

  markdown += `- [${name}](${html_url}) ${
    homepage ? `([homepage](${homepage}))` : ``
  } - ${description || "No description provided."}\n`;
}

console.log(`Writing ${data.length} repos to README.md...`);
await Deno.writeTextFile("README.md", markdown);

console.log("Done!");
