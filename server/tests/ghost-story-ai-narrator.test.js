const test = require("node:test");
const assert = require("node:assert/strict");

const { createGhostNarrator } = require("../ghost-story/ai-narrator");

const PACK = {
  title: "宿舍守则第13条",
  intro: "第13条一直都在。"
};

test("ghost narrator uses spark output for intro and ending when spark succeeds", async () => {
  let callCount = 0;
  const narrator = createGhostNarrator({
    sparkClient: {
      complete: async () => {
        callCount += 1;
        return callCount === 1 ? "AI 开场白" : "AI 结局总结";
      }
    }
  });

  const intro = await narrator.narrateIntro(PACK);
  const ending = await narrator.narrateEnding({
    pack: PACK,
    endingText: "你活了下来。"
  });

  assert.equal(intro, "AI 开场白");
  assert.equal(ending, "AI 结局总结");
});

test("ghost narrator falls back to template text when spark fails", async () => {
  const narrator = createGhostNarrator({
    sparkClient: {
      complete: async () => {
        throw new Error("spark timeout");
      }
    }
  });

  const intro = await narrator.narrateIntro(PACK);
  const ending = await narrator.narrateEnding({
    pack: PACK,
    endingText: "你活了下来。"
  });

  assert.match(intro, /宿舍守则第13条/);
  assert.match(ending, /AI总结：你活了下来/);
});
