const state = {
  books: [],
  bible: {},
  backgrounds: {},
  testament: "old",
  bookId: "",
  chapter: 1
};

const els = {
  testament: document.getElementById("testamentSelect"),
  book: document.getElementById("bookSelect"),
  chapter: document.getElementById("chapterSelect"),
  chapterSummary: document.getElementById("chapterSummary"),
  prev: document.getElementById("prevChapter"),
  next: document.getElementById("nextChapter"),
  scriptureTitle: document.getElementById("scriptureTitle"),
  scriptureContent: document.getElementById("scriptureContent"),
  backgroundTitle: document.getElementById("backgroundTitle"),
  backgroundContent: document.getElementById("backgroundContent"),
  commentaryChat: document.getElementById("commentaryChat"),
  dailyReminder: document.getElementById("dailyReminder"),
  dailyPrayer: document.getElementById("dailyPrayer")
};

async function loadData() {
  const [books, bible, backgrounds] = await Promise.all([
    fetch("data/books.json").then((res) => res.json()),
    fetch("data/bible.json").then((res) => res.json()),
    fetch("data/backgrounds.json").then((res) => res.json())
  ]);

  state.books = books;
  state.bible = bible;
  state.backgrounds = backgrounds;
  state.bookId = books.find((book) => book.testament === state.testament).id;

  bindEvents();
  renderBooks();
  renderChapterOptions();
  renderPage();
}

function bindEvents() {
  els.testament.addEventListener("change", () => {
    state.testament = els.testament.value;
    state.bookId = getBooksByTestament()[0].id;
    state.chapter = 1;
    renderBooks();
    renderChapterOptions();
    renderPage();
  });

  els.book.addEventListener("change", () => {
    state.bookId = els.book.value;
    state.chapter = 1;
    renderChapterOptions();
    renderPage();
  });

  els.chapter.addEventListener("change", () => {
    state.chapter = Number(els.chapter.value);
    renderPage();
  });

  els.prev.addEventListener("click", () => moveChapter(-1));
  els.next.addEventListener("click", () => moveChapter(1));
}

function getBooksByTestament() {
  return state.books.filter((book) => book.testament === state.testament);
}

function getCurrentBook() {
  return state.books.find((book) => book.id === state.bookId);
}

function renderBooks() {
  els.book.innerHTML = getBooksByTestament()
    .map((book) => `<option value="${book.id}">${book.name}</option>`)
    .join("");
  els.book.value = state.bookId;
}

function renderChapterOptions() {
  const book = getCurrentBook();
  els.chapter.innerHTML = Array.from({ length: book.chapters }, (_, index) => {
    const chapter = index + 1;
    return `<option value="${chapter}">第 ${chapter} 章</option>`;
  }).join("");
  els.chapter.value = state.chapter;
  els.chapterSummary.textContent = `${book.name} 共 ${book.chapters} 章`;
}

function renderPage() {
  const book = getCurrentBook();
  const chapterData = state.bible[state.bookId]?.[state.chapter];
  const verses = chapterData?.verses || [];
  const study = buildChapterStudy(book, state.chapter, verses);

  els.scriptureTitle.textContent = `${book.name} 第 ${state.chapter} 章`;
  els.scriptureContent.innerHTML = renderVerses(chapterData);
  els.backgroundTitle.textContent = `${book.name} 第 ${state.chapter} 章背景`;
  els.backgroundContent.textContent = study.background;
  els.commentaryChat.innerHTML = renderCommentary(study.messages);
  els.dailyReminder.textContent = study.reminder;
  els.dailyPrayer.textContent = study.prayer;

  els.prev.disabled = state.chapter <= 1;
  els.next.disabled = state.chapter >= book.chapters;
  els.chapter.value = state.chapter;
}

function renderVerses(chapterData) {
  if (!chapterData || !chapterData.verses?.length) {
    return `
      <p class="muted-text">
        本章目前尚未加入经文。你可以在 data/bible.json 中按相同结构补入合法授权的经文内容。
      </p>
    `;
  }

  return chapterData.verses
    .map((verse) => `
      <p class="verse">
        <span class="verse-number">${verse.verse}</span>${escapeHtml(verse.text)}
      </p>
    `)
    .join("");
}

function renderCommentary(messages) {
  return messages
    .map((message) => `
      <article class="chat-message ${message.role}">
        <span class="chat-role">${message.role === "question" ? "提问" : "回应"}</span>
        ${escapeHtml(message.text)}
      </article>
    `)
    .join("");
}

function buildChapterStudy(book, chapter, verses) {
  if (!verses.length) {
    return {
      background: "本章还没有经文内容，因此暂时不能产生章节背景、提醒和逐节解经。请先在 data/bible.json 中按 verses 数组补入经文；每一节建议保留 verse 和 text 两个字段。补齐之后，系统会自动根据本章经文生成背景说明、灵修提醒、祷告，以及从第一节到最后一节的聊天式解经。",
      reminder: "先补齐本章经文，再进行查经和默想。",
      prayer: "主啊，求你帮助我珍惜你的话，也预备我的心按正意分解真理。阿们。",
      messages: [
        { role: "question", text: "这一章可以怎样开始解经？" },
        { role: "answer", text: "请先补入本章经文。系统会按照每一节的内容，逐节给出观察、解释和应用方向。" }
      ]
    };
  }

  return {
    background: buildChapterBackground(book, chapter, verses),
    reminder: buildDailyReminder(book, chapter, verses),
    prayer: buildDailyPrayer(book, chapter, verses),
    messages: buildVerseByVerseChat(book, chapter, verses)
  };
}

function buildChapterBackground(book, chapter, verses) {
  const intro = state.backgrounds[book.id] || `${book.name}是圣经正典中的一卷重要书卷，适合放在整本圣经启示、救恩历史和群体信仰生活中阅读。`;
  const first = verses[0];
  const middle = verses[Math.floor(verses.length / 2)];
  const last = verses[verses.length - 1];
  const themes = detectThemes(verses);

  return `${book.name}第${chapter}章共有${verses.length}节。阅读本章时，可以先留意它在${book.name}中的位置：${intro}本章从第${first.verse}节“${shorten(first.text, 32)}”展开，到第${last.verse}节“${shorten(last.text, 32)}”收束，中间第${middle.verse}节附近也帮助我们看见段落推进。整体而言，本章可从${themes.join("、")}几个角度观察：先看神怎样显明自己的心意，再看人怎样回应、顺服、抗拒或等待，最后思想这段经文怎样指向敬拜、信靠与实际生活。若用于查经，可按人物、地点、重复词、命令、应许、警戒和结果来分段；若用于灵修，可问自己：这章让我更认识神的哪一面？我今天需要悔改、相信或实践什么？这样读，就不只是取得资料，而是让经文进入生命。`;
}

function buildDailyReminder(book, chapter, verses) {
  const themes = detectThemes(verses);
  const imperative = verses.find((verse) => /要|不可|当|应当|你们|务要|谨守|听/.test(verse.text));
  const promise = verses.find((verse) => /赐|福|恩|爱|怜悯|拯救|生命|永生|平安/.test(verse.text));
  const warning = verses.find((verse) => /罪|恶|审判|祸|死|灭|惧怕|责备/.test(verse.text));

  return [
    `今天读${book.name}第${chapter}章，要特别留意${themes.join("、")}。`,
    imperative ? `本章提醒我们不要只听见道理，也要回应经文中的呼召，例如第${imperative.verse}节所呈现的方向。` : "本章提醒我们在平凡处境中继续观察神的作为，不急着下结论，也不把信仰停留在知识层面。",
    promise ? `若你今天需要盼望，可以思想第${promise.verse}节附近的应许与安慰。` : "若你今天感到困惑，可以先把焦点放回神的性情，而不是只看眼前环境。",
    warning ? "若经文指出罪、恶或审判，也要诚实省察自己是否需要悔改和调整。" : "这章也教导我们把所读的真理化为具体行动，在家庭、工作、教会和人际关系中活出来。"
  ].join("");
}

function buildDailyPrayer(book, chapter, verses) {
  const themes = detectThemes(verses);

  return `主啊，谢谢你借着${book.name}第${chapter}章向我说话。求你帮助我明白本章关于${themes.join("、")}的教导，不只是读过，也能存在心里。若经文显明我的骄傲、惧怕、冷淡或不顺服，求你光照并更新我；若经文带来应许和安慰，求你坚固我的信心。愿我今天按你的话思想、选择和行动。阿们。`;
}

function buildVerseByVerseChat(book, chapter, verses) {
  const first = verses[0];
  const middle = verses[Math.floor(verses.length / 2)];
  const last = verses[verses.length - 1];
  const themes = detectThemes(verses);
  const command = verses.find((verse) => /要|不可|当|应当|你们|务要|谨守|听/.test(verse.text));
  const promise = verses.find((verse) => /赐|福|恩|爱|怜悯|拯救|生命|永生|平安/.test(verse.text));
  const warning = verses.find((verse) => /罪|恶|审判|祸|死|灭|惧怕|责备/.test(verse.text));

  const messages = [
    {
      role: "question",
      text: `${book.name}第${chapter}章主要在讲什么？可以用白话一点的方式说明吗？`
    },
    {
      role: "answer",
      text: `可以。本章共有${verses.length}节，重点可以从${themes.join("、")}来看。简单说，这一章不是只给我们一些宗教知识，而是在帮助我们看见神怎样工作，人应该怎样回应，以及今天我们可以怎样把信仰活出来。`
    },
    {
      role: "question",
      text: "这一章的脉络怎样抓？"
    },
    {
      role: "answer",
      text: `可以先看开头和结尾。第${first.verse}节提到：“${shorten(first.text, 38)}”；到第${last.verse}节，经文来到：“${shorten(last.text, 38)}”。中间第${middle.verse}节附近也给我们一个重要转折或补充。这样读，就比较容易看出本章不是零散句子，而是一段有推进的属灵信息。`
    },
    {
      role: "question",
      text: "读这一章时，我要特别注意什么？"
    },
    {
      role: "answer",
      text: buildChatAttention(command, promise, warning)
    },
    {
      role: "question",
      text: "这章对今天的我有什么实际教导？"
    },
    {
      role: "answer",
      text: `这章提醒我们，读经不只是知道“发生了什么”，更要问“神要我怎样回应”。你可以今天选一个很具体的行动：相信一个应许、停止一个不讨神喜悦的习惯、向一个人表达爱、或者在困难中继续顺服。若能把${book.name}第${chapter}章带进今天的选择里，这章经文就真正成为灵修和生活的帮助。`
    }
  ];

  return messages;
}

function buildChatAttention(command, promise, warning) {
  const parts = [];

  if (command) {
    parts.push(`经文里有呼召和回应的方向，例如第${command.verse}节附近提醒我们不要只是听见，而要顺服。`);
  }

  if (promise) {
    parts.push(`这里也有安慰和盼望，例如第${promise.verse}节附近可以帮助我们重新抓住神的恩典。`);
  }

  if (warning) {
    parts.push(`同时，本章若提到罪、审判或警戒，也是在提醒我们诚实省察，不要把神的话只用在别人身上。`);
  }

  if (!parts.length) {
    parts.push("读这一章时，可以留意人物的选择、事情的发展、重复出现的词，以及经文最后把我们带到什么回应。");
  }

  return parts.join("");
}

function detectThemes(verses) {
  const allText = verses.map((verse) => verse.text).join("");
  const themes = [];

  if (/神|耶和华|主/.test(allText)) themes.push("认识神的作为");
  if (/爱|恩|怜悯|慈爱|福|平安|生命/.test(allText)) themes.push("领受恩典与盼望");
  if (/罪|恶|审判|祸|死|灭|怒/.test(allText)) themes.push("面对罪与警戒");
  if (/要|不可|当|应当|听|谨守|命令|律法/.test(allText)) themes.push("学习顺服与实践");
  if (/信|义|救|拯救|福音|基督|耶稣/.test(allText)) themes.push("回应救恩与信心");
  if (/祷告|赞美|称谢|敬拜|求/.test(allText)) themes.push("操练祷告与敬拜");

  return themes.slice(0, 3).length ? themes.slice(0, 3) : ["观察上下文", "认识人的处境", "回应神的话"];
}

function shorten(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function escapeHtml(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}

function moveChapter(step) {
  const book = getCurrentBook();
  const nextChapter = state.chapter + step;

  if (nextChapter < 1 || nextChapter > book.chapters) {
    return;
  }

  state.chapter = nextChapter;
  renderPage();
}

loadData().catch((error) => {
  console.error(error);
  els.scriptureContent.innerHTML = "<p class=\"muted-text\">资料载入失败，请检查 data 目录中的 JSON 文件。</p>";
});
