const DEFAULT_CATEGORIES = ["故事繪本", "文學小說", "科學知識", "歷史地理", "理財教育", "成長學習", "其他"];
const BOOKS_URL = "./books.json";
const STATUS_STORAGE_KEY = "readingForest.statusOverrides.v1";

// 僅保存使用者在頁面上變更的閱讀狀態，不直接修改 GitHub 的 books.json。
function loadStatusOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    console.warn("讀取本機閱讀狀態失敗：", error);
    return {};
  }
}

let statusOverrides = loadStatusOverrides();

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
    const statusLabel = book.status === "read" ? "已閱讀" : "待閱讀";
    const readDateLabel = book.status === "read" && book.readDate
      ? `<p class="read-date">📅 完成日期：${escapeHTML(book.readDate)}</p>`
      : "";
    const statusButton = book.status === "unread"
      ? `<button class="mark-read-button" type="button" data-toggle-reading-status="${escapeHTML(book.id)}" aria-label="將${title}標記為已閱讀">✓ 我讀完了！</button>`
      : `<button class="mark-read-button undo-read-button" type="button" data-toggle-reading-status="${escapeHTML(book.id)}" aria-label="將${title}改回待閱讀">↩ 改回待閱讀</button>`;
    return `<article class="book-card"><div class="cover-wrap">${cover}</div><h3 class="book-title">${title}</h3><p class="book-author">${author}</p><div class="book-meta">${rating}<span class="status-pill ${book.status === "read" ? "read" : "unread"}">${statusLabel}</span></div>${readDateLabel}${statusButton}</article>`;
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
    // 將本機狀態覆蓋套用在 GitHub 書庫資料上，重新整理後仍可保留。
    books = books.map(book => {
      const override = statusOverrides[book.id];
      return override && ["read", "unread"].includes(override.status)
        ? { ...book, status: override.status, readDate: override.readDate ?? book.readDate ?? "" }
        : book;
    });
    elements.note.textContent = "書籍資料已載入；頁面上的閱讀狀態會保存在這台裝置。";
  } catch (error) {
    console.error("讀取書籍資料失敗：", error);
    books = [];
    elements.note.textContent = "目前無法載入書籍資料，請稍後重新整理。";
  }
  render();
}

elements.search.addEventListener("input", renderBooks);
elements.status.addEventListener("change", renderBooks);
elements.grid.addEventListener("click", event => {
  const button = event.target.closest("[data-toggle-reading-status]");
  if (!button) return;
  const bookId = button.dataset.toggleReadingStatus;
  const book = books.find(item => item.id === bookId);
  if (!book) return;

  const previousStatus = book.status;
  const previousReadDate = book.readDate || "";
  const nextStatus = previousStatus === "unread" ? "read" : "unread";
  let nextReadDate = "";

  if (nextStatus === "read") {
    const today = new Date();
    nextReadDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");
  }

  const previousOverride = statusOverrides[bookId];
  statusOverrides[bookId] = { status: nextStatus, readDate: nextReadDate };
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusOverrides));
    book.status = nextStatus;
    book.readDate = nextReadDate;
    elements.note.textContent = nextStatus === "read"
      ? `太棒了！「${book.title}」已標記為已閱讀，完成日期：${nextReadDate}。`
      : `已將「${book.title}」改回待閱讀，並清除原完成日期。`;
    render();
  } catch (error) {
    console.error("保存閱讀狀態失敗：", error);
    if (previousOverride === undefined) delete statusOverrides[bookId];
    else statusOverrides[bookId] = previousOverride;
    book.status = previousStatus;
    book.readDate = previousReadDate;
    elements.note.textContent = "目前無法保存閱讀紀錄，請確認瀏覽器允許使用本機儲存空間。";
  }
});

elements.categories.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderBooks();
});

loadBooks();