import { expect, it } from "vitest";
import {
  extractVscodePrompt,
  vscodePromptFilename,
} from "../src/features/vscodePrompt";
const bytes = (html: string) => new TextEncoder().encode(html);

it("préserve le Markdown, les accents et les entités sans exécuter le HTML", () => {
  const prompt = "# Évaluation\n\n```sh\necho '<script> & test'\n```\n";
  const encoded = prompt.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  expect(
    extractVscodePrompt(
      bytes(
        `<script>throw new Error('ne pas exécuter')</script><textarea id="fullPrompt">${encoded}</textarea>`,
      ),
    ),
  ).toBe(prompt);
});

it("ne confond pas un rapport, un champ de notes ou une instruction de script avec un prompt", () => {
  expect(
    extractVscodePrompt(
      bytes(
        '<h2>Rapport</h2><textarea>Notes</textarea><script>const fullPrompt="secret"</script>',
      ),
    ),
  ).toBeNull();
  expect(
    extractVscodePrompt(bytes('<textarea id="fullPrompt">  </textarea>')),
  ).toBeNull();
  expect(
    extractVscodePrompt(
      bytes(
        "<h2>Prompt VS Code</h2><pre># Mission\n\nTexte</pre><h2>Suite</h2><pre>Autre code</pre>",
      ),
    ),
  ).toBe("# Mission\n\nTexte");
  expect(() =>
    extractVscodePrompt(
      bytes("<h2>Prompt VS Code</h2><pre>Choix A</pre><pre>Choix B</pre>"),
    ),
  ).toThrow("Plusieurs prompts");
});

it("produit un nom Markdown local sans chemin ni caractères de contrôle", () => {
  expect(vscodePromptFilename("../SENTINEL_2026-10-19.html")).toBe(
    "SENTINEL_2026-10-19_PROMPT_VSCODE.md",
  );
  expect(vscodePromptFilename("C:\\dossier\\alerte?.html")).toBe(
    "alerte__PROMPT_VSCODE.md",
  );
});
