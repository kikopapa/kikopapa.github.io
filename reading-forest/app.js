const DEFAULT_CATEGORIES = ["故事繪本", "文學小說", "科學知識", "歷史地理", "理財教育", "成長學習", "其他"];
const BOOKS_URL = "./books.json";

const elements = {
  total: document.querySelector("#total-count"),
  read: document.querySelector("#read-count"),
  unread: document.querySelector("#unread-count"),
  visible: document.querySelector("#visible-count"),
  search: document.querySelector("#search-input"),
  status: document.querySelector("#status-filter"),
  categories: document.querySelector("#category-list"),
  grid: document.querySelector("#book-grid"),
  note: document.querySelector("#data-note")
};

let books = [];
let activeCategory = "全部";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderStats() {
  const readCount = books.filter(book => book.status === "read").length;
  elements.total.textContent = books.length;
  elements.read.textContent = readCount;
  elements.unread.textContent = books.length - readCount;
}

function renderCategories() {
  const categories = ["全部", ...new Set([...DEFAULT_CATEGORIES, ...books.map(book => book.category).filter(Boolean)])];
  elements.categories.innerHTML = categories.map(category => {
    const selected = category === activeCategory;
    return `<button class="category-chip${selected ? " active" : ""}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${selected}">${escapeHTML(category)}</button>`;
  }).join("");
}

function getVisibleBooks() {
  const keyword = elements.search.value.trim().toLocaleLowerCase();
  const status = elements.status.value;
  return books.filter(book => {
    const matchesCategory = activeCategory === "全部" || book.category === activeCategory;
    const matchesStatus = status === "all" || book.status === status;
    const searchable = `${book.title || ""} ${book.author || ""}`.toLocaleLowerCase();
    return matchesCategory && matchesStatus && searchable.includes(keyword);
  });
}

function renderBooks() {
  const visibleBooks = getVisibleBooks();
  elements.visible.textContent = `顯示 ${visibleBooks.length} / ${books.length} 本`;

  if (!visibleBooks.length) {
    const hasBooks = books.length > 0;
    elements.grid.innerHTML = hasBooks
      ? `<div class="empty-state"><span class="empty-emoji">🔎</span><h3>找不到這本書</h3><p>試試其他書名、作者或分類吧！</p></div>`
      : `<div class="empty-state"><span class="empty-emoji">🌳</span><h3>森林正在等待第一本書</h3><p>把喜歡的書收藏進來，讓閱讀森林慢慢長大。</p></div>`;
    return;
  }

  elements.grid.innerHTML = visibleBooks.map(book => {
    const title = escapeHTML(book.title);
    const author = escapeHTML(book.author || "作者未填寫");
    const cover = book.cover ? `<img src="${escapeHTML(book.cover)}" alt="${title}封面" loading="lazy" onerror="this.remove();this.parentElement.innerHTML='<span class=&quot;cover-placeholder&quot;>📖</span>'">` : '<span class="cover-placeholder" aria-hidden="true">📖</span>';
    const rating = Number.isInteger(book.rating) && book.rating >= 1 && book.rating <= 5
      ? `<span class="rating" aria-label="${book.rating} 顆星">${"★".repeat(book.rating)}${"☆".repeat(5 - book.rating)}</span>`
      : '<span class="rating" aria-label="尚未評分">☆☆☆☆☆</span>';
    const statusLabel = book.status === "read" ? "已讀完" : "待閱讀";
    return `<article class="book-card"><div class="cover-wrap">${cover}</div><h3 class="book-title">${title}</h3><p class="book-author">${author}</p><div class="book-meta">${rating}<span class="status-pill ${book.status === "read" ? "read" : "unread"}">${statusLabel}</span></div></article>`;
  }).join("");
}

function render() {
  renderStats();
  renderCategories();
  renderBooks();
}

async function loadBooks() {
  try {
    const response = await fetch(BOOKS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("books.json 必須是 JSON 陣列");
    books = data.filter(book => book && typeof book.id === "string" && typeof book.title === "string" && ["read", "unread"].includes(book.status));
    elements.note.textContent = "書籍資料已從 GitHub Pages 載入。";
  } catch (error) {
    console.error("讀取書籍資料失敗：", error);
    books = [];
    elements.note.textContent = "目前無法載入書籍資料，請稍後重新整理。";
  }
  render();
}

elements.search.addEventListener("input", renderBooks);
elements.status.addEventListener("change", renderBooks);
elements.categories.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderBooks();
});

loadBooks();