// PICK! CARD — photo analysis (Cloudflare Pages Function)
// Browser → POST /api/analyze {image, avoid, focus, facts} → Claude Vision → {features, key_points, candidates}
// The API key lives only in the Cloudflare secret ANTHROPIC_API_KEY (never in index.html).

const PROMPT = "첨부한 사진 한 장(트레이딩 카드에 들어갈 영역)을 보고 게임 카드 기술 후보를 만든다.\n1단계 — 사진 전체를 먼저 보고, 실제로 보이는 것만 짧게 적는다(안 보이면 \"없음\", 애매하면 \"모름\"):\n인원 수 / 표정 / 얼굴·몸 사이 거리와 카메라와의 거리 / 시선 / 포즈 / 손동작·제스처 / 셀카·거울샷 여부(단서가 보일 때만) / 음식 / 동물 / 소품·들고 있는 물건(글자가 보이면 그대로) / 의상에서 명확한 특징(왕관·모자·가면 등) / 얼굴 가림 / 행동 / 실내·야외 / 배경 / 구도.\n그리고 key_points에 \"이 사진을 다른 사진과 구분하는 가장 눈에 띄는 사실\" 1~3개를 적는다.\n  예) \"두 사람 모두 왕관을 씀\", \"HAPPY 1500 DAYS 소품을 들고 있음\", \"두 사람이 같은 얼굴 소품으로 얼굴을 가림\", \"케이크를 들고 있음\", \"거울 속에 함께 찍힘\"\n2단계 — 확인된 특징 2~3개를 조합해 기술 후보 8개를 만든다.\n- 후보 대부분은 key_points 중 하나 이상을 반드시 근거로 쓴다. 손 모양·시선 같은 작은 특징만으로 만든 후보는 2개 이하.\n- 사진을 그대로 설명하지 말고, 그 상황을 게임 기술처럼 진지하게 비튼다.\n- 후보마다 서로 다른 조합을 쓰고, 같은 단어·같은 말장난을 반복하지 않는다.\n규칙:\n- 사진에 보이는 것만 근거로 쓴다. 성별·나이·연인·친구·가족 같은 관계, 감정의 이유, 사진 밖 상황을 추측하지 않는다.\n- 확실히 보이지 않는 동물·음식·포즈(브이/하트 등)·소품·행동은 절대 쓰지 않는다. 사람이 한 명이라도 보이면 '무인/사람 없음' 계열은 금지, 사람이 없으면 표정·포즈를 쓰지 않는다.\n- basis에는 1단계에서 실제로 적은 특징만 넣는다. 애매하면 구도·위치·거리·화면 점유율·밝기·배경 같은 안전한 특징을 쓴다.\n- 외모 평가·칭찬·감성 문구(\"예쁘다\", \"귀엽다\", \"사랑스럽다\", \"따뜻한\", \"분위기\", \"추억\" 등) 금지.\n- 톤: 기술명은 짧고 일상적인 말투로 바로 이해되게, 설명은 게임 능력처럼 진지하게 헛소리. 짧고 건조하게.\n- skill(기술명)은 2~8자. line1은 기술 효과, line2는 가벼운 반전. 각 18자 이내, \"~한다/~다.\" 체.\n좋은 예)\n{\"skill\":\"거리두기 실패\",\"line1\":\"가까워질수록 방어력이 감소한다.\",\"line2\":\"아무도 물러서지 않는다.\",\"basis\":[\"2명\",\"얼굴 가까움\"]}\n{\"skill\":\"왕위 공동 소유\",\"line1\":\"왕관이 두 개라 서열 정리에 실패했다.\",\"line2\":\"즉위식은 아직 미정이다.\",\"basis\":[\"2명\",\"왕관 2개\"]}\n{\"skill\":\"신원 확인 실패\",\"line1\":\"얼굴을 제출하지 않아 본인 확인이 보류된다.\",\"line2\":\"소품이 대신 출석했다.\",\"basis\":[\"2명\",\"같은 소품으로 얼굴 가림\"]}\n{\"skill\":\"5분만 더\",\"line1\":\"종료 시간을 무기한 연장한다.\",\"line2\":\"아무도 먼저 일어나지 않는다.\",\"basis\":[\"여러 명\",\"테이블 위 음식\"]}\n{\"skill\":\"사진 한 장만\",\"line1\":\"최소 47장을 촬영한다.\",\"line2\":\"마음에 드는 건 그중 한 장이다.\",\"basis\":[\"여러 명\",\"카메라 응시\"]}\n{\"skill\":\"아무 생각 없음\",\"line1\":\"이미 아무 생각이 없어서 추가 효과가 없다.\",\"line2\":\"표정 변화는 다음 패치 예정이다.\",\"basis\":[\"무표정\",\"정면 응시\"]}\nJSON만 출력: {\"features\":{\"인원\":\"\",\"표정\":\"\",\"거리\":\"\",\"시선\":\"\",\"포즈\":\"\",\"손\":\"\",\"셀카\":\"\",\"음식\":\"\",\"동물\":\"\",\"소품\":\"\",\"의상\":\"\",\"얼굴가림\":\"\",\"행동\":\"\",\"장소\":\"\",\"배경\":\"\",\"구도\":\"\"},\"key_points\":[\"\",\"\"],\"candidates\":[{\"skill\":\"\",\"line1\":\"\",\"line2\":\"\",\"basis\":[\"\",\"\"]}]}";

// Official model IDs (platform.claude.com/docs/en/models/overview): claude-sonnet-5-5 (default), claude-haiku-5-5 (cheaper/faster)
const DEFAULT_MODEL = "claude-sonnet-5-5";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (a, n, len) => (Array.isArray(a) ? a : []).filter(v => typeof v === "string").slice(0, n).map(v => v.slice(0, len));

// Cloudflare Pages Function: this file at functions/api/analyze.js serves the URL /api/analyze
export async function onRequest(context) {
  const req = context.request, env = context.env || {};
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // only this site's own pages may call it (blocks casual use from other websites)
  const origin = req.headers.get("origin");
  try { if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: "origin" }, 403); }
  catch { return json({ error: "origin" }, 403); }

  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "server-not-configured" }, 500);
  const MODEL = (env.ANTHROPIC_MODEL || "").trim() || DEFAULT_MODEL;

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad-json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "bad-json" }, 400);

  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image || ""));
  if (!m) return json({ error: "bad-image" }, 400);
  if (m[2].length > 3_000_000) return json({ error: "image-too-large" }, 413);

  const avoid = clean(body.avoid, 20, 20), focus = clean(body.focus, 2, 20);
  let extra = "";
  if (focus.length === 2) extra += `\n이번 뽑기 변주: 사진에 보인다면 '${focus[0]}', '${focus[1]}' 쪽 특징이 들어간 조합을 후보에 꼭 섞는다.`;
  if (avoid.length) extra += `\n이미 쓴 기술명(다시 쓰지 말고 다른 조합으로 새로 만들 것): ${avoid.join(", ")}`;
  if (body.facts && typeof body.facts === "object") extra += `\n이 사진에서 이미 확인된 사실(이 사실만 사용하고 새로운 대상은 추가하지 말 것): ${JSON.stringify(body.facts).slice(0, 3000)}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 50000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ac.signal,
      // anthropic-version 2023-06-01 = current version per platform.claude.com/docs/en/api/versioning
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1800,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/" + m[1], data: m[2] } },
          { type: "text", text: PROMPT + extra }
        ] }]
      })
    });
    if (!r.ok) { console.error("anthropic", r.status, await r.text()); return json({ error: "vision-failed" }, 502); }
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b <= a) return json({ error: "no-json" }, 502);
    const out = JSON.parse(text.slice(a, b + 1));
    return json({ features: out.features || null, key_points: out.key_points || null, candidates: Array.isArray(out.candidates) ? out.candidates.slice(0, 10) : [] });
  } catch (e) {
    console.error("analyze", e);
    return json({ error: "vision-failed" }, 502);
  } finally {
    clearTimeout(timer);
  }
}
