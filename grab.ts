import { z } from "https://deno.land/x/zod@v3.20.0/mod.ts";

console.log("Fetching repos...");
const response = (async function* () {
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/users/LeoDog896/repos?page=${page}&per_page=100`,
    );
    const data = await res.json();
    if (data.length === 0) {
      break;
    }
    yield { data };
    page++;
  }
})();

let data: unknown[] = [];

for await (const page of response) {
  console.log(`Fetched ${page.data.length} repos...`);
  data = data.concat(page.data);
}

console.log(`Writing ${data.length} repos to repos.json...`);

await Deno.writeTextFile("repos.json", JSON.stringify(data, null, 2));

let markdown = `# leodog896.github.io

these are auto-generated lists of repositories on my account, mainly for catalogue info.

looking for my website? go to https://leodog896.com instead.

## Repositories
`;

const schema = z.array(z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  html_url: z.string(),
  stargazers_count: z.number(),
  homepage: z.string().optional().nullable(),
}));

const verifiedData = schema.parse(data);

// sort data by stargazers_count
const sorted = verifiedData.sort((a, b) => {
  const aStars = a.stargazers_count;
  const bStars = b.stargazers_count;
  return bStars - aStars;
});

for (const repo of sorted) {
  const { name, description, html_url, stargazers_count, homepage } = repo;

  markdown += `- [${name} (${stargazers_count})](${html_url}) ${
    homepage ? `([homepage](${homepage}))` : ``
  } - ${description || "No description provided."}\n`;
}

console.log(`Writing ${data.length} repos to README.md...`);
await Deno.writeTextFile("README.md", markdown);

console.log("Done!");
