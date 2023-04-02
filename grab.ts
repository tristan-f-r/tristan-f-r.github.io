import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";

console.log("Fetching repos...");
async function* getRepos(): AsyncGenerator<unknown[], void, void> {
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/users/LeoDog896/repos?page=${page}&per_page=100`,
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    const data = await res.json();
    if (data.length === 0) {
      break;
    }
    yield data;
    page++;
  }
}

let data: unknown[] = [];

for await (const page of getRepos()) {
  console.log(`Fetched ${page.length} repos...`);
  data = data.concat(page);
}

console.log(`Writing ${data.length} repos to repos.json...`);

await Deno.writeTextFile("repos.json", JSON.stringify(data, null, 2));

const schema = z.array(z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  html_url: z.string(),
  stargazers_count: z.number(),
  homepage: z.string().optional().nullable(),
  fork: z.boolean(),
}));

const verifiedData = schema.parse(data);

const projects = verifiedData.filter((repo) =>
  !repo.fork || repo.stargazers_count > 1
);
const forks = verifiedData.filter((repo) =>
  repo.fork && repo.stargazers_count <= 1
);

function sortRepos(
  a: typeof verifiedData[number],
  b: typeof verifiedData[number],
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
`;

for (const repo of projects) {
  const { name, description, html_url, stargazers_count, homepage } = repo;

  markdown += `- [${name} (${stargazers_count})](${html_url}) ${
    homepage ? `([homepage](${homepage}))` : ``
  } - ${description || "No description provided."}\n`;
}

markdown += `
## Forks (${forks.length})
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
