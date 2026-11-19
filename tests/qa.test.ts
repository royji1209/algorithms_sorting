import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  GUARDRAIL_REJECTION_MESSAGE,
  performEmotionCheckinWithGuardrail,
  analyzePostMoodAndTags,
} from "../src/lib/ai/gemini-guardrail.ts";
import {
  curateDailyLetters,
  getCachedDailyDeliveries,
  setCachedDailyDeliveries,
  clearDailyDeliveriesCache,
} from "../src/lib/curation/letter-matcher.ts";
import { isAuthorizedAdminEmail } from "../src/lib/auth/admin-guard.ts";
import {
  INITIAL_SEED_POSTS,
  filterPostsByRLS,
  canUserAccessPostByRLS,
} from "../src/lib/store/seed-data.ts";

async function runQaSuite() {
  const cssContent = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  for (const hex of ["#FDF9F2", "#FFFDF9", "#B84A39", "#9E3C2D", "#D99B38", "#FBF2E1", "#2D241E", "#7A6B61", "#EAE0D0"]) {
    assert.ok(cssContent.toUpperCase().includes(hex));
  }
  const offTopic = await performEmotionCheckinWithGuardrail("오늘 서울 강남 맛집 추천해 줘");
  assert.equal(offTopic.allowed, false);
  assert.equal(offTopic.message, GUARDRAIL_REJECTION_MESSAGE);

  const positiveDeliveries = curateDailyLetters({
    allPosts: INITIAL_SEED_POSTS,
    userValence: "positive",
    userEmotionTags: ["행복"],
    recipientId: "user-me",
    dayOfWeek: 2,
    maxLetters: 2,
  });
  for (const d of positiveDeliveries) {
    assert.notEqual(d.post.mood_valence, "deep_gloomy");
    assert.notEqual(d.post.mood_valence, "melancholy");
  }

  clearDailyDeliveriesCache();
  setCachedDailyDeliveries("user-me", "2026-11-18", 3, positiveDeliveries);
  assert.ok(getCachedDailyDeliveries("user-me", "2026-11-18", 3) !== null);

  const visibleToMe = filterPostsByRLS(INITIAL_SEED_POSTS, "user-me");
  assert.equal(visibleToMe.find((p) => p.id === "poem-private-other-user"), undefined);
  const myPrivate = INITIAL_SEED_POSTS.find((p) => p.id === "poem-my-library-private")!;
  assert.equal(canUserAccessPostByRLS(myPrivate, "user-me"), true);
  assert.equal(canUserAccessPostByRLS(myPrivate, "user-stranger"), false);

  process.env.ADMIN_EMAILS = "admin@marginmailbox.kr";
  assert.equal(isAuthorizedAdminEmail("admin@marginmailbox.kr"), true);
  assert.equal(isAuthorizedAdminEmail("seoyeon@example.com"), false);
  assert.ok(analyzePostMoodAndTags("단풍", "따뜻한 차 한 잔").mood_valence === "warm");
  console.log("✅ All QA tests passed!");
}

runQaSuite();
