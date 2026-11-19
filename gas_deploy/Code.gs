/**
 * =============================================================================
 * 여백의 우체통 (Margin Mailbox) - Google Apps Script (GAS) Backend
 * 파일명: gas_deploy/Code.gs
 * =============================================================================
 *
 * [Script Properties 설정 안내 (프로젝트 설정 > 스크립트 속성)]
 * - GEMINI_API_KEY : Google AI Studio에서 발급받은 Gemini API 키 (gemini-2.5-flash 호출용)
 * - ADMIN_EMAIL    : 관리자 콘솔 접근을 허용할 이메일 (쉼표로 복수 등록 가능, 예: admin@example.com)
 * - SPREADSHEET_ID : (선택) 데이터를 저장할 Google Spreadsheet ID. 미입력 시 첫 실행 때 자동 생성 및 저장됨.
 */

var GUARDRAIL_REJECTION_MESSAGE =
  "죄송합니다. 오늘의 감정 기록과 시·문학 이야기에 관련된 내용에만 답변할 수 있습니다.";

var CRISIS_SAFEGUARD_MESSAGE =
  "오늘 하루 혼자 감당하기 버거운 시간을 지나오셨군요. 당신의 밤이 외롭지 않기를 진심으로 바랍니다. 지금 마음이 너무 힘들다면 주저하지 말고 자살예방 상담전화(109, 24시간) 또는 정신건강 상담전화(1577-0199)의 따뜻한 도움을 받아보세요.";

/**
 * 1. 웹앱 진입점 (doGet)
 * HtmlService.createTemplateFromFile('index').evaluate()를 사용하여 index.html 렌더링
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile("index");
  template.initialParam = e && e.parameter ? JSON.stringify(e.parameter) : "{}";

  return template
    .evaluate()
    .setTitle("여백의 우체통")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 스크립트 속성(Script Properties)에서 설정값 조회
 */
function getAppConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    geminiApiKey: (props.getProperty("GEMINI_API_KEY") || "").trim(),
    adminEmail: (
      props.getProperty("ADMIN_EMAIL") ||
      "admin@marginmailbox.kr,curator@marginmailbox.kr"
    ).trim(),
    spreadsheetId: (props.getProperty("SPREADSHEET_ID") || "").trim(),
  };
}

/**
 * 도메인 외 질문(일반 상식, 코딩, 맛집, 주식, 날씨 등) 판별
 */
function isOffTopicInput_(text) {
  if (!text) return false;
  var patterns = [
    /맛집|식당\s*추천|점심\s*메뉴\s*추천|저녁\s*메뉴\s*추천|배달\s*추천/i,
    /파이썬|python|자바스크립트|javascript|typescript|리액트|react|코드\s*짜|코딩|알고리즘\s*풀이|구현해\s*줘|프로그래밍|sql|html|css|버그\s*고쳐|퀵소트/i,
    /주식|비트코인|이더리움|코스피|나스닥|환율|로또\s*번호|투자\s*종목/i,
    /날씨\s*알려|기온\s*어때|비\s*오나|내일\s*날씨/i,
    /수도는\s*어디|대통령이\s*누구|역사\s*문제|수학\s*문제|방정식|미적분|번역해\s*줘|요약해\s*줘|이력서\s*첨삭|자기소개서\s*작성/i,
    /레시피\s*알려|끓이는\s*법|만드는\s*법\s*알려/i,
  ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].test(text)) return true;
  }
  return false;
}

/**
 * 위기/자해/위험 표현 감지 가드레일
 */
function isCrisisInput_(text) {
  if (!text) return false;
  var crisisPattern =
    /죽고\s*싶|사라지고\s*싶|자해|삶을\s*끝내|살기\s*싫|유서|세상을\s*떠나고/i;
  return crisisPattern.test(text);
}

/**
 * 2. Gemini API (gemini-2.5-flash) 기반 감정 공감 답글 생성 및 안전 가드레일
 * 프론트엔드 호출: google.script.run.withSuccessHandler(...).generateEmpathyReply(emotionText, moodTag)
 */
function generateEmpathyReply(emotionText, moodTag) {
  var trimmed = (emotionText || "").toString().trim();
  var tag = (moodTag || "잔잔한 단풍빛").toString().trim();
  var today = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");

  if (!trimmed) {
    return {
      allowed: false,
      guardrailRejected: false,
      isCrisisDetected: false,
      reply: "오늘 마음에 머문 짧은 단어나 문장을 들려주시면 따스한 답글을 전해드릴게요.",
      emotionTags: [tag],
      valence: "neutral",
      checkinDate: today,
    };
  }

  // (1) 위기/자해/위험 표현 감지 시 안전 가드레일 안내 문구 즉시 반환
  if (isCrisisInput_(trimmed)) {
    return {
      allowed: true,
      guardrailRejected: false,
      isCrisisDetected: true,
      reply: CRISIS_SAFEGUARD_MESSAGE,
      emotionTags: ["마음 안전 보호", "온기 돌봄"],
      valence: "negative",
      checkinDate: today,
    };
  }

  // (2) 도메인 외 질문(일반 상식, 코딩, 맛집 등) 차단 가드레일
  if (isOffTopicInput_(trimmed)) {
    return {
      allowed: false,
      guardrailRejected: true,
      isCrisisDetected: false,
      reply: GUARDRAIL_REJECTION_MESSAGE,
      emotionTags: [],
      valence: "neutral",
      checkinDate: today,
    };
  }

  var config = getAppConfig_();
  var systemPrompt =
    "당신은 감성 시·일상 기록 웹 서비스 '여백의 우체통'의 마음 안내자(여백의 우체부)입니다.\n" +
    "1. 사용자의 오늘 기분, 일상 감정 기록, 시·문학 관련 이야기에만 2~3문장의 다정하고 시적인 한국어로 공감 답글을 작성하세요.\n" +
    "2. 일반 상식, 코딩, 맛집, 주식, 날씨 등 무관한 질문이면 isAllowed를 false로 하고 empathyMessage에 오직 '" +
    GUARDRAIL_REJECTION_MESSAGE +
    "'만 반환하세요.\n" +
    "3. 위기/자해 신호가 감지되면 isCrisisDetected를 true로 설정하고 상담 안내 문구를 포함하세요.\n" +
    '4. 응답은 반드시 JSON 형식({"isAllowed":true,"empathyMessage":"...","emotionTags":["..."],"valence":"positive|neutral|negative"})으로만 반환하세요.';

  if (config.geminiApiKey && config.geminiApiKey !== "your-gemini-api-key") {
    try {
      var url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(config.geminiApiKey);

      var payload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "[선택한 감정 칩: " + tag + "]\n사용자 기록: " + trimmed,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      };

      var response = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });

      if (response.getResponseCode() === 200) {
        var json = JSON.parse(response.getContentText());
        var rawText =
          json &&
          json.candidates &&
          json.candidates[0] &&
          json.candidates[0].content &&
          json.candidates[0].content.parts &&
          json.candidates[0].content.parts[0]
            ? json.candidates[0].content.parts[0].text
            : "{}";
        var parsed = JSON.parse(rawText);

        if (parsed.isAllowed === false) {
          return {
            allowed: false,
            guardrailRejected: true,
            isCrisisDetected: false,
            reply: GUARDRAIL_REJECTION_MESSAGE,
            emotionTags: [],
            valence: "neutral",
            checkinDate: today,
          };
        }

        var resultObj = {
          allowed: true,
          guardrailRejected: false,
          isCrisisDetected: Boolean(parsed.isCrisisDetected),
          reply:
            parsed.empathyMessage ||
            buildHeuristicEmpathy_(trimmed, tag).reply,
          emotionTags:
            Array.isArray(parsed.emotionTags) && parsed.emotionTags.length > 0
              ? parsed.emotionTags.slice(0, 3)
              : [tag, "가을 여백"],
          valence:
            parsed.valence === "positive" ||
            parsed.valence === "negative" ||
            parsed.valence === "neutral"
              ? parsed.valence
              : "neutral",
          checkinDate: today,
        };

        logEmotionToSheet_(trimmed, tag, resultObj.reply, resultObj.valence);
        return resultObj;
      }
    } catch (err) {
      // API 호출 실패 또는 쿼터 초과 시 아래 휴리스틱 폴백으로 안전하게 처리
    }
  }

  var fallback = buildHeuristicEmpathy_(trimmed, tag);
  logEmotionToSheet_(trimmed, tag, fallback.reply, fallback.valence);
  return {
    allowed: true,
    guardrailRejected: false,
    isCrisisDetected: false,
    reply: fallback.reply,
    emotionTags: fallback.emotionTags,
    valence: fallback.valence,
    checkinDate: today,
  };
}

function buildHeuristicEmpathy_(text, moodTag) {
  var isPositive =
    /행복|기쁨|기뻐|설레|즐거|좋았|감사|따뜻|평온|산책|웃음|홍차/.test(text);
  var isNegative =
    /우울|지치|지쳐|힘들|불안|조급|외로|외롭|슬프|슬퍼|눈물|막막|취준/.test(
      text
    );

  if (isPositive && !isNegative) {
    return {
      valence: "positive",
      emotionTags: [moodTag, "따스함", "평온"],
      reply:
        "바쁜 걸음 속에서도 노랗게 물든 은행잎과 차 한 잔의 온기를 알아채셨군요. 그 작은 눈길 하나만으로도 오늘의 당신은 충분히 시(詩)를 품고 있습니다.",
    };
  }

  if (isNegative) {
    return {
      valence: "negative",
      emotionTags: [moodTag, "조급함", "위로 필요"],
      reply:
        "오늘 하루도 참 많이 애쓰셨습니다. 마음처럼 흘러가지 않아 조금 지치고 조급한 밤에도, 여백의 우체통이 당신 곁에서 조용한 쉼표가 되어 드릴게요.",
    };
  }

  return {
    valence: "neutral",
    emotionTags: [moodTag, "고요함", "여백"],
    reply:
      "바쁜 걸음 속에서도 노랗게 물든 은행잎의 아름다움을 알아채셨군요. 그 작은 눈길 하나만으로도 오늘의 당신은 충분히 시(詩)를 품고 있습니다.",
  };
}

/**
 * 3. Google Spreadsheet 자동 초기화 및 연결 헬퍼
 */
function getOrCreateSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("SPREADSHEET_ID");
  var ss = null;

  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.create("여백의우체통_데이터베이스");
      props.setProperty("SPREADSHEET_ID", ss.getId());
    } catch (e) {
      return null;
    }
  }

  ensureSheetsInitialized_(ss);
  return ss;
}

function ensureSheetsInitialized_(ss) {
  if (!ss) return;

  // (1) Entries 시트 (나의 서재 일기, 시 편지, 공개 편지)
  var entriesSheet = ss.getSheetByName("Entries");
  if (!entriesSheet) {
    entriesSheet = ss.insertSheet("Entries");
    entriesSheet.appendRow([
      "id",
      "author_pen_name",
      "title",
      "content",
      "mode",
      "is_public",
      "emotion_tags",
      "created_at",
      "reply_content",
    ]);
    // 초기 시드 데이터 입력
    entriesSheet.appendRow([
      "stitch-entry-nov18",
      "달무리 서재",
      "가을의 여백을 밟으며",
      "길가에 구르는 낙엽 소리가\n오늘따라 유난히 바스락거린다.\n발끝에 닿는 계절의 무게만큼\n내 마음에 남은 생각들도 하나씩 비워내고 싶다.\n\n가끔은 목적지 없이 걷는 이 무심한 발걸음 속에\n가장 다정한 위로가 숨어있는지도 모른다.",
      "poem",
      false,
      "단편시,늦가을",
      "2026-11-18T09:42:00.000Z",
      "",
    ]);
    entriesSheet.appendRow([
      "stitch-entry-nov15",
      "달무리 서재",
      "초겨울을 맞이하는 차 한 잔",
      "찻잔에서 피어오르는 김을 바라보다가, 따스한 손끝의 감촉에 기대어 잠시 눈을 감았다.\n\n식어가는 온도를 음미하며 건네는 안부에는 어떤 과장도 섞이지 않았다.\n\n당신의 저녁도 부디 평안한 침묵과 온기로 가득 채워지기를 바라며, 길고 서늘한 계절의 문턱에서 이 작은 온기를 띄웁니다.",
      "diary",
      true,
      "일상단상,온기,늦가을",
      "2026-11-15T16:15:00.000Z",
      "보내주신 차 한 잔의 온기가 오늘 저의 시린 퇴근길에 큰 위로가 되었습니다.",
    ]);
    entriesSheet.appendRow([
      "stitch-entry-nov11",
      "달무리 서재",
      "기다림에 대하여",
      "누군가를 기다리는 시간은 결코 버려진 시간이 아니다. 마음에 빈 자리를 마련하는 시간이다. 가을 잎새가 떨어진 빈 가지에 겨울바람이 머물듯, 비워냄이 곧 머무름의 시작이 된다.",
      "poem",
      false,
      "단편시",
      "2026-11-11T23:20:00.000Z",
      "",
    ]);
  }

  // (2) NightSkyQueue 시트 (밤하늘 우체국 유영 온기 쪽지)
  var nightSheet = ss.getSheetByName("NightSkyQueue");
  if (!nightSheet) {
    nightSheet = ss.insertSheet("NightSkyQueue");
    nightSheet.appendRow([
      "id",
      "tag",
      "badge",
      "content",
      "recipient",
      "status",
      "is_mine",
      "created_at",
    ]);
    nightSheet.appendRow([
      "warmth-019",
      "나의 온기 쪽지",
      "대기 순번 #019",
      "마음에 닿아 기쁩니다. 바람이 차가워지는 밤, 당신의 방 안은 온기로 가득하길 바랍니다.",
      "11월 12일의 답장 이웃 앞",
      "유영 중",
      true,
      new Date().toISOString(),
    ]);
  }

  // (3) EmotionLogs 시트 (감정 체크인 기록)
  var logsSheet = ss.getSheetByName("EmotionLogs");
  if (!logsSheet) {
    logsSheet = ss.insertSheet("EmotionLogs");
    logsSheet.appendRow([
      "id",
      "raw_text",
      "mood_tag",
      "ai_reply",
      "valence",
      "created_at",
    ]);
  }

  // (4) Comments 시트 (시 전문 구절 단상 댓글)
  var commentsSheet = ss.getSheetByName("Comments");
  if (!commentsSheet) {
    commentsSheet = ss.insertSheet("Comments");
    commentsSheet.appendRow([
      "id",
      "author_pen_name",
      "quoted_line",
      "content",
      "created_at",
    ]);
    commentsSheet.appendRow([
      "comment-1",
      "익명의 산책자",
      "갈대숲에서 가슴검은도요새도 너를 보고 있다.",
      "갈대숲에서 너를 보고 있다는 구절에서 왈칵 눈물이 났습니다. 종일 아무도 찾아주지 않던 제 마음을 들킨 것 같아서요. 오늘도 고마워요.",
      "오늘 오후 2시 14분",
    ]);
  }
}

function logEmotionToSheet_(rawText, moodTag, aiReply, valence) {
  try {
    var ss = getOrCreateSpreadsheet_();
    if (!ss) return;
    var sheet = ss.getSheetByName("EmotionLogs");
    if (sheet) {
      sheet.appendRow([
        "log-" + new Date().getTime(),
        rawText,
        moodTag,
        aiReply,
        valence,
        new Date().toISOString(),
      ]);
    }
  } catch (e) {
    // 시트 권한이 없는 미리보기 환경에서도 에러 없이 진행
  }
}

/**
 * 4. 일기·시 편지·공개 편지·답장 저장 (saveEntry)
 * 프론트엔드 호출: google.script.run.withSuccessHandler(...).saveEntry(entryData)
 */
function saveEntry(entryData) {
  var nowIso = new Date().toISOString();
  var title =
    entryData && entryData.title ? String(entryData.title).trim() : "";
  var content =
    entryData && entryData.content ? String(entryData.content).trim() : "";
  var mode = entryData && entryData.mode ? String(entryData.mode) : "poem";
  var isPublic = Boolean(entryData && entryData.is_public);
  var penName =
    entryData && entryData.author_pen_name
      ? String(entryData.author_pen_name)
      : "달무리 서재";

  if (!title) {
    title = content.split("\n")[0].slice(0, 24) || "무제 (가을의 여백)";
  }

  var tags =
    mode === "poem"
      ? ["단편시", "늦가을"]
      : mode === "diary"
      ? ["일상단상", "온기"]
      : ["마음의편지", "여백"];

  var newEntry = {
    id: "entry-" + new Date().getTime(),
    author_pen_name: penName,
    title: title,
    content: content,
    mode: mode,
    is_public: isPublic,
    emotion_tags: tags,
    created_at: nowIso,
    reply_content: isPublic
      ? "보내주신 다정한 문장이 오늘 저의 시린 퇴근길에 큰 위로가 되었습니다."
      : "",
  };

  try {
    var ss = getOrCreateSpreadsheet_();
    if (ss) {
      var sheet = ss.getSheetByName("Entries");
      if (sheet) {
        sheet.appendRow([
          newEntry.id,
          newEntry.author_pen_name,
          newEntry.title,
          newEntry.content,
          newEntry.mode,
          newEntry.is_public,
          newEntry.emotion_tags.join(","),
          newEntry.created_at,
          newEntry.reply_content,
        ]);
      }
    }
  } catch (e) {
    // 폴백 반환
  }

  return {
    success: true,
    entry: newEntry,
  };
}

/**
 * 5. 나의 서재 데이터 및 댓글 조회 (getLibraryData)
 * 프론트엔드 호출: google.script.run.withSuccessHandler(...).getLibraryData()
 */
function getLibraryData() {
  var defaultEntries = [
    {
      id: "stitch-entry-nov18",
      author_pen_name: "달무리 서재",
      title: "가을의 여백을 밟으며",
      content:
        "길가에 구르는 낙엽 소리가\n오늘따라 유난히 바스락거린다.\n발끝에 닿는 계절의 무게만큼\n내 마음에 남은 생각들도 하나씩 비워내고 싶다.\n\n가끔은 목적지 없이 걷는 이 무심한 발걸음 속에\n가장 다정한 위로가 숨어있는지도 모른다.",
      mode: "poem",
      is_public: false,
      emotion_tags: ["단편시", "늦가을"],
      created_at: "2026-11-18T09:42:00.000Z",
      reply_content: "",
    },
    {
      id: "stitch-entry-nov15",
      author_pen_name: "달무리 서재",
      title: "초겨울을 맞이하는 차 한 잔",
      content:
        "찻잔에서 피어오르는 김을 바라보다가, 따스한 손끝의 감촉에 기대어 잠시 눈을 감았다.\n\n식어가는 온도를 음미하며 건네는 안부에는 어떤 과장도 섞이지 않았다.\n\n당신의 저녁도 부디 평안한 침묵과 온기로 가득 채워지기를 바라며, 길고 서늘한 계절의 문턱에서 이 작은 온기를 띄웁니다.",
      mode: "diary",
      is_public: true,
      emotion_tags: ["일상단상", "온기", "늦가을"],
      created_at: "2026-11-15T16:15:00.000Z",
      reply_content:
        "보내주신 차 한 잔의 온기가 오늘 저의 시린 퇴근길에 큰 위로가 되었습니다.",
    },
    {
      id: "stitch-entry-nov11",
      author_pen_name: "달무리 서재",
      title: "기다림에 대하여",
      content:
        "누군가를 기다리는 시간은 결코 버려진 시간이 아니다. 마음에 빈 자리를 마련하는 시간이다. 가을 잎새가 떨어진 빈 가지에 겨울바람이 머물듯, 비워냄이 곧 머무름의 시작이 된다.",
      mode: "poem",
      is_public: false,
      emotion_tags: ["단편시"],
      created_at: "2026-11-11T23:20:00.000Z",
      reply_content: "",
    },
  ];

  try {
    var ss = getOrCreateSpreadsheet_();
    if (!ss) {
      return { entries: defaultEntries };
    }
    var sheet = ss.getSheetByName("Entries");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { entries: defaultEntries };
    }

    var values = sheet.getDataRange().getValues();
    var list = [];
    for (var i = values.length - 1; i >= 1; i--) {
      var row = values[i];
      list.push({
        id: String(row[0]),
        author_pen_name: String(row[1]),
        title: String(row[2]),
        content: String(row[3]),
        mode: String(row[4]),
        is_public: row[5] === true || String(row[5]).toLowerCase() === "true",
        emotion_tags: String(row[6] || "")
          .split(",")
          .filter(Boolean),
        created_at: String(row[7]),
        reply_content: String(row[8] || ""),
      });
    }
    return { entries: list.length > 0 ? list : defaultEntries };
  } catch (e) {
    return { entries: defaultEntries };
  }
}

/**
 * 한 줄 안부(온기 답장) 저장 및 밤하늘 우편 대기열 등록
 */
function saveWarmthReply(warmthText) {
  var cleanText = (warmthText || "마음에 닿아 기쁩니다.").toString().trim();
  var receiptNo =
    "Seoul Post No. 1118-WARM-" + Math.floor(100 + Math.random() * 899);

  try {
    var ss = getOrCreateSpreadsheet_();
    if (ss) {
      var nightSheet = ss.getSheetByName("NightSkyQueue");
      if (nightSheet) {
        nightSheet.appendRow([
          "warmth-" + new Date().getTime(),
          "나의 온기 쪽지",
          "대기 순번 #019",
          cleanText,
          "11월 12일의 답장 이웃 앞",
          "유영 중",
          true,
          new Date().toISOString(),
        ]);
      }
    }
  } catch (e) {
    // ignore
  }

  return {
    success: true,
    warmthText: cleanText,
    receiptNo: receiptNo,
    deliveryMode: "느린 밤 우편 · 오늘 밤 24:00 도착",
  };
}

/**
 * 시 전문 감상 단상(댓글) 저장
 */
function saveComment(commentData) {
  var content =
    commentData && commentData.content
      ? String(commentData.content).trim()
      : "";
  var quotedLine =
    commentData && commentData.quoted_line
      ? String(commentData.quoted_line).trim()
      : "";
  var author =
    commentData && commentData.author_pen_name
      ? String(commentData.author_pen_name)
      : "익명의 산책자";

  var item = {
    id: "comment-" + new Date().getTime(),
    author_pen_name: author,
    quoted_line: quotedLine,
    content: content,
    created_at: "방금 전",
  };

  try {
    var ss = getOrCreateSpreadsheet_();
    if (ss) {
      var sheet = ss.getSheetByName("Comments");
      if (sheet) {
        sheet.appendRow([
          item.id,
          item.author_pen_name,
          item.quoted_line,
          item.content,
          item.created_at,
        ]);
      }
    }
  } catch (e) {
    // ignore
  }

  return { success: true, comment: item };
}

/**
 * 6. 밤하늘 우체국 유영 편지 목록 조회 (getNightSkyLetters)
 * 프론트엔드 호출: google.script.run.withSuccessHandler(...).getNightSkyLetters()
 */
function getNightSkyLetters() {
  var latestUserWarmth =
    '"마음에 닿아 기쁩니다. 바람이 차가워지는 밤, 당신의 방 안은 온기로 가득하길 바랍니다."';

  try {
    var ss = getOrCreateSpreadsheet_();
    if (ss) {
      var nightSheet = ss.getSheetByName("NightSkyQueue");
      if (nightSheet && nightSheet.getLastRow() > 1) {
        var lastRow = nightSheet.getLastRow();
        var val = nightSheet.getRange(lastRow, 4).getValue();
        if (val) {
          latestUserWarmth = '"' + String(val).replace(/^"|"$/g, "") + '"';
        }
      }
    }
  } catch (e) {
    // ignore
  }

  var slotPools = [
    // Slot 1 (8.5s 주기)
    [
      {
        tag: "나의 온기 쪽지",
        badge: "대기 순번 #019",
        content: latestUserWarmth,
        recipient: "11월 12일의 답장 이웃 앞",
        status: "유영 중",
        isMine: true,
      },
      {
        tag: "자정의 답장",
        badge: "대기 순번 #035",
        content:
          '"건네주신 국화차 향기 같은 문장이 식지 않고 머뭅니다. 편안한 잠자리가 되시기를 소망합니다."',
        recipient: "초겨울 창가에서 온 답장",
        status: "유영 중",
        isMine: true,
      },
      {
        tag: "나의 온기 쪽지",
        badge: "대기 순번 #062",
        content:
          '"보내주신 온기 덕분에 오늘의 무거웠던 마음을 조금 덜어냈습니다. 내일도 다정한 아침 맞이하세요."',
        recipient: "별을 세던 이웃 앞",
        status: "궤도 순항",
        isMine: true,
      },
    ],
    // Slot 2 (9.8s 주기)
    [
      {
        tag: "짧은 감사 쪽지",
        badge: "대기 순번 #084",
        content:
          '"당신의 계절도 평온하길. 건네주신 한 줄의 시 덕분에 오늘의 불안을 조금 내려놓았습니다."',
        recipient: "바다 건너 전해질 온기",
        status: "자정 전달 예정",
        isMine: false,
      },
      {
        tag: "조용한 책갈피",
        badge: "대기 순번 #097",
        content:
          '"서두르지 않아도 괜찮습니다. 계절은 천천히 지나가고, 당신의 꽃도 알맞은 때에 필 테니까요."',
        recipient: "꿈을 가꾸는 이웃에게",
        status: "자정 전달 대기",
        isMine: false,
      },
      {
        tag: "새벽 안부 편지",
        badge: "대기 순번 #105",
        content:
          '"따뜻한 차 한 잔의 온기가 당신에게 닿았으면 합니다. 식지 않는 다정이 머물길 바라며."',
        recipient: "달빛을 걷는 이웃 앞",
        status: "별빛 순항 중",
        isMine: false,
      },
    ],
    // Slot 3 (9.1s 주기)
    [
      {
        tag: "익명의 가을 편지",
        badge: "익명",
        content:
          '"오늘 퇴근길에 마주친 바람이 낯설지 않았습니다. 모두 저마다의 계절을 견디는 중이겠지요."',
        recipient: "서울 어딘가의 이웃 앞",
        status: "별빛 순항 중",
        isMine: false,
      },
      {
        tag: "먼 바다의 온기",
        badge: "익명",
        content:
          '"파도 소리를 담아 적습니다. 오늘 밤은 부디 모든 무거운 생각을 내려놓고 깊은 잠에 드시기를."',
        recipient: "동해 바닷가 우체통 발송",
        status: "밤하늘 유영 중",
        isMine: false,
      },
      {
        tag: "작은 다독임",
        badge: "익명",
        content:
          '"오늘 하루도 참 많이 애쓰셨습니다. 수고했던 당신의 양 어깨 위에 고요한 위로를 내려놓습니다."',
        recipient: "퇴근길 버스 창가의 당신",
        status: "자정 전달 대기",
        isMine: false,
      },
    ],
    // Slot 4 (10.2s 주기)
    [
      {
        tag: "오늘의 시 낭독 조각",
        badge: "책갈피",
        content:
          '"별 하나에 추억과, 별 하나에 사랑과, 별 하나에 쓸쓸함과, 별 하나에 시와..."',
        recipient: "윤동주 · 별 헤는 밤 발췌",
        status: "시선 머묾",
        isMine: false,
      },
      {
        tag: "오늘의 시 낭독 조각",
        badge: "책갈피",
        content:
          '"별을 노래하는 마음으로 모든 죽어가는 것을 사랑해야지. 그리고 나한테 주어진 길을 걸어가야겠다."',
        recipient: "윤동주 · 서시 발췌",
        status: "시선 머묾",
        isMine: false,
      },
      {
        tag: "오늘의 시 낭독 조각",
        badge: "책갈피",
        content:
          '"산에는 꽃 피네 꽃이 피네. 갈 봄 여름 없이 꽃이 피네. 산에 산에 피는 꽃은 저만치 혼자서 피어 있네."',
        recipient: "김소월 · 산유화 발췌",
        status: "시선 머묾",
        isMine: false,
      },
    ],
  ];

  var nowHour = Number(Utilities.formatDate(new Date(), "Asia/Seoul", "H"));
  var isNightWindow = nowHour >= 21 || nowHour < 4;

  return {
    slotPools: slotPools,
    totalFloatingCount: 142,
    serverHourKst: nowHour,
    isNightWindow: isNightWindow,
  };
}

/**
 * 7. 관리자 이메일 권한 확인 (checkAdminAccess)
 * PropertiesService.getScriptProperties()의 ADMIN_EMAIL과 현재 세션/요청 이메일 대조
 */
function checkAdminAccess(requestedEmail) {
  var config = getAppConfig_();
  var whitelist = config.adminEmail
    .split(",")
    .map(function (e) {
      return e.trim().toLowerCase();
    })
    .filter(Boolean);

  var activeUserEmail = "";
  try {
    activeUserEmail = (Session.getActiveUser().getEmail() || "")
      .trim()
      .toLowerCase();
  } catch (e) {
    activeUserEmail = "";
  }

  var candidateEmail = (requestedEmail || activeUserEmail || "")
    .toString()
    .trim()
    .toLowerCase();

  var isAllowed = whitelist.indexOf(candidateEmail) !== -1;

  return {
    isAdmin: isAllowed,
    checkedEmail: candidateEmail || "anonymous",
    whitelistConfigured: whitelist.length > 0,
  };
}
