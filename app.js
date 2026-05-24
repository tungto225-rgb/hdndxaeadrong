const meetingData = structuredClone(window.meetingData);
const { config, delegates, agenda, documents, speeches, votes } = meetingData;

let currentUser = null;
let activeTab = "tongquan";

const app = document.getElementById("app");
const isTv = new URLSearchParams(window.location.search).get("screen") === "tv";

if (isTv) {
  document.body.classList.add("tv-page");
  renderTv();
} else {
  renderApp();
}

function renderApp() {
  document.title = "Họp không giấy HĐND xã";
  app.innerHTML = `
    <header class="header">
            <div>
        <h1 class="header-title">${config.systemName}</h1>
        <small class="header-subtitle">${config.owner}</small>
      </div>
       </header>

    <section id="loginBox" class="box ${currentUser ? "hidden" : ""}">
      <h3>Đăng nhập đại biểu</h3>
      <input id="idDaiBieu" placeholder="Mã đại biểu" value="DB001" required>
      <input id="matKhau" type="password" placeholder="Mật khẩu" value="123456" required>
      <button onclick="login()">Đăng nhập</button>
      <p id="loginMsg" class="message"></p>
    </section>

    <main id="appBox" class="${currentUser ? "" : "hidden"}">
      <section class="user-info">
        <b>${currentUser?.name || ""}</b><br>
        <span>${currentUser?.position || ""}</span><br>
        <span>${currentUser?.unit || ""}</span>
        <button onclick="logout()">Đăng xuất</button>
      </section>

      <nav class="menu">
        ${menuButton("tongquan", "Tổng quan")}
        ${menuButton("chuongtrinh", "Chương trình")}
        ${menuButton("diemdanh", "Điểm danh")}
        ${menuButton("tailieu", "Tài liệu")}
        ${menuButton("phienbieuquyet", "Biểu quyết")}
        ${menuButton("phatbieu", "Phát biểu")}
        ${menuButton("thuky", "Thư ký")}
        ${menuButton("manhinhchutoa", "Màn hình")}
      </nav>

      ${renderTabs()}
    </main>
  `;
  updateClock();
}

function menuButton(tab, label) {
  return `<button onclick="showTab('${tab}')" ${activeTab === tab ? "class='btn-yellow'" : ""}>${label}</button>`;
}

function renderTabs() {
  return `
    <section id="tongquan" class="box ${tabClass("tongquan")}">
      <div class="section-head">
        <div>
          <h3>Tổng quan kỳ họp</h3>
          <p>${config.session} tại ${config.venue}</p>
        </div>
        <span class="status-pill">Đang diễn ra</span>
      </div>
      <div class="summary-grid">
        ${summaryCard("Đại biểu có mặt", `${attendance().present}/${attendance().total}`, "Cập nhật theo điểm danh")}
        ${summaryCard("Tài liệu", documents.length, "Đã phát hành")}
        ${summaryCard("Ý kiến thảo luận", speeches.filter((item) => !item.done).length, "Đang chờ phát biểu")}
        ${summaryCard("Phiên biểu quyết", votes.filter((item) => item.open).length, "Đang mở")}
      </div>
      <div class="notice-band">
        Kỳ họp đang ở phần thảo luận tại hội trường. Thư ký có thể cập nhật phát biểu, điểm danh và kết quả biểu quyết để màn hình lớn hiển thị theo thời gian thực.
      </div>
    </section>

    <section id="chuongtrinh" class="box ${tabClass("chuongtrinh")}">
      <h3>Chương trình kỳ họp</h3>
      <div class="timeline">
        ${agenda.map((item) => `
          <div class="timeline-item">
            <div class="timeline-time">${item.time}</div>
            <div>
              <b>${item.title}</b><br>
              <span class="secretary-badge">${item.status}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </section>

    <section id="diemdanh" class="box ${tabClass("diemdanh")}">
      <h3>Điểm danh đại biểu</h3>
      <button class="btn-green" onclick="markPresent()">Tôi có mặt</button>
      <p class="message">${currentUser?.present ? "Đã ghi nhận có mặt." : ""}</p>
    </section>

    <section id="tailieu" class="box ${tabClass("tailieu")}">
      <h3>Tài liệu kỳ họp</h3>
      ${documents.map((item) => `
        <div class="card">
          <span class="doc-type">${item.type}</span>
          <b>${item.title}</b><br>
          ${item.note}<br>
          <a href="${item.link}">Mở tài liệu</a>
        </div>
      `).join("")}
    </section>

    <section id="phienbieuquyet" class="box ${tabClass("phienbieuquyet")}">
      <h3>Phiên biểu quyết</h3>
      <div class="admin-card">
        <h4>Tạo phiên biểu quyết mới</h4>
        <input id="voteTitle" placeholder="Tiêu đề biểu quyết">
        <textarea id="voteContent" rows="4" placeholder="Nội dung biểu quyết"></textarea>
        <button onclick="createVote()">Tạo phiên</button>
      </div>
      ${votes.filter((vote) => vote.open).map(renderVoteCard).join("") || "Không có phiên biểu quyết đang mở"}
    </section>

    <section id="phatbieu" class="box ${tabClass("phatbieu")}">
      <h3>Đăng ký phát biểu</h3>
      <textarea id="speechContent" rows="4" placeholder="Nội dung phát biểu"></textarea>
      <button onclick="addSpeech()">Gửi đăng ký</button>
      <p id="speechMsg" class="message"></p>
    </section>

    <section id="thuky" class="box ${tabClass("thuky")}">
      <h3>Giao diện thư ký kỳ họp</h3>
      <div class="thuky-grid">
        <div class="admin-card thuky-panel">
          <div class="thuky-actions"><h4>Theo dõi điểm danh</h4></div>
          ${renderAttendanceList()}
        </div>
        <div class="admin-card thuky-panel">
          <div class="thuky-actions"><h4>Quản lý thứ tự phát biểu</h4></div>
          ${speeches.map((item, index) => `
            <div class="card">
              <b>${index + 1}. ${item.name}</b><br>
              Nội dung: ${item.content}<br>
              <span class="secretary-badge">${item.done ? "Đã phát biểu xong" : "Đang chờ phát biểu"}</span>
              <button onclick="finishSpeech(${item.id})">Đã phát biểu xong</button>
            </div>
          `).join("")}
        </div>
        <div class="admin-card thuky-panel">
          <div class="thuky-actions"><h4>Theo dõi biểu quyết</h4></div>
          ${votes.map(renderStatsCard).join("")}
        </div>
      </div>
    </section>

    <section id="manhinhchutoa" class="box screen-mode ${tabClass("manhinhchutoa")}">
      <div class="screen-top">
        <div>
          <h2>HĐND Xã</h2>
          <h3>${config.meetingName}</h3>
        </div>
        <div class="clock-box">
          <span id="clock">00:00:00</span><br>
          <small id="date"></small>
        </div>
      </div>
      <div class="screen-grid">
        <div class="screen-card">
          <h3>Điểm danh</h3>
          <div class="big-number">${attendance().present}/${attendance().total}</div>
          <p>Đại biểu có mặt</p>
        </div>
        <div class="screen-card">
          <h3>Biểu quyết</h3>
          ${renderChairVote()}
        </div>
        <div class="screen-card">
          <h3>Thứ tự phát biểu</h3>
          ${renderChairSpeeches()}
        </div>
      </div>
      <button onclick="window.open('index.html?screen=tv', '_blank')">Mở màn hình TV</button>
    </section>

    <section id="taikhoan" class="box ${tabClass("taikhoan")}">
      <h3>Quản lý tài khoản</h3>
      ${delegates.map((item) => `
        <div class="card">
          <b>${item.name}</b><br>
          Mã: ${item.id}<br>
          ${item.position}<br>
          ${item.unit}<br>
          Quyền: ${item.role} - Cấp ${item.level}<br>
          Trạng thái: <b>Đang hoạt động</b>
        </div>
      `).join("")}
    </section>

    <section id="cauhinh" class="box ${tabClass("cauhinh")}">
      <h3>Cấu hình hệ thống</h3>
      <input value="${config.systemName}" aria-label="Tên hệ thống">
      <input value="${config.meetingName}" aria-label="Tên kỳ họp">
      <input value="${config.owner}" aria-label="Đơn vị chủ quản">
      <button>Lưu cấu hình</button>
    </section>
  `;
}

function summaryCard(label, value, note) {
  return `
    <div class="summary-card">
      <span>${label}</span>
      <b>${value}</b>
      <small>${note}</small>
    </div>
  `;
}

function tabClass(tab) {
  return activeTab === tab ? "" : "hidden";
}

function renderVoteCard(vote) {
  return `
    <div class="card">
      <b>${vote.title}</b><br>
      ${vote.content}
      <div class="grid-actions">
        <button class="btn-green" onclick="castVote('${vote.id}', 'yes')">Đồng ý</button>
        <button class="btn-red" onclick="castVote('${vote.id}', 'no')">Không đồng ý</button>
        <button class="btn-yellow" onclick="castVote('${vote.id}', 'other')">Ý kiến khác</button>
      </div>
      ${renderStatsCard(vote)}
    </div>
  `;
}

function renderStatsCard(vote) {
  return `
    <div class="card">
      Đồng ý: <b>${vote.yes}</b><br>
      Không đồng ý: <b>${vote.no}</b><br>
      Ý kiến khác: <b>${vote.other}</b><br>
      Tổng: <b>${vote.yes + vote.no + vote.other}</b>
    </div>
  `;
}

function renderAttendanceList() {
  const data = attendance();
  return `
    <div class="card">
      Tổng đại biểu: <b>${data.total}</b><br>
      Có mặt: <b>${data.present}</b><br>
      Chưa điểm danh: <b>${data.absent}</b>
    </div>
    ${delegates.map((item) => `
      <div class="card">
        <b>${item.name}</b><br>
        ${item.position}<br>
        ${item.unit}<br>
        Trạng thái: <b>${item.present ? "Có mặt" : "Chưa điểm danh"}</b>
      </div>
    `).join("")}
  `;
}

function renderChairVote() {
  const vote = votes.find((item) => item.open);
  if (!vote) return "Chưa có phiên đang mở";
  return `
    <div style="text-align:left; font-size:22px; line-height:1.55">
      <b>${vote.title}</b><br>
      Đồng ý: <b>${vote.yes}</b><br>
      Không đồng ý: <b>${vote.no}</b><br>
      Ý kiến khác: <b>${vote.other}</b><br>
      Tổng: <b>${vote.yes + vote.no + vote.other}</b>
    </div>
  `;
}

function renderChairSpeeches() {
  const waiting = speeches.filter((item) => !item.done);
  if (!waiting.length) return "Không còn đại biểu chờ phát biểu";
  return waiting.map((item, index) => `
    <div class="speech-row">
      <span class="speech-number">${index + 1}</span>
      <b>${item.name}</b><br>
      ${item.content}
    </div>
  `).join("");
}

function renderTv() {
  document.title = "Màn hình trình chiếu kỳ họp";
  const data = attendance();
  const vote = votes.find((item) => item.open);
  const waiting = speeches.filter((item) => !item.done).slice(0, 6);
  app.innerHTML = `
    <div class="tv-wrapper">
      <header class="tv-header">
        <div class=""</div>
        <div class="tv-title">
          <h1>${config.systemName}</h1>
          <h2>${config.meetingName}</h2>
        </div>
        <div class="tv-clock">
          <div id="clock" class="clock-time">00:00:00</div>
          <div id="date" class="clock-date"></div>
        </div>
      </header>

      <main class="main-grid">
        <section class="panel">
          <div class="panel-title">ĐIỂM DANH ĐẠI BIỂU</div>
          <div class="panel-body">
            <div class="attendance-number">${data.present}/${data.total}</div>
            <div class="attendance-label">Đại biểu có mặt</div>
            <div class="attendance-extra">
              <div class="mini-box">Có mặt<br><b>${data.present}</b></div>
              <div class="mini-box">Chưa điểm danh<br><b>${data.absent}</b></div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">KẾT QUẢ BIỂU QUYẾT</div>
          <div class="panel-body">
            ${vote ? `
              <div class="vote-title">${vote.title}</div>
              <div class="vote-content">${vote.content}</div>
              <div class="vote-grid">
                ${tvVoteRow("Đồng ý", vote.yes)}
                ${tvVoteRow("Không đồng ý", vote.no)}
                ${tvVoteRow("Ý kiến khác", vote.other)}
                ${tvVoteRow("Tổng số phiếu", vote.yes + vote.no + vote.other)}
              </div>
            ` : `<div class="empty">Chưa có phiên biểu quyết đang mở</div>`}
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">THỨ TỰ PHÁT BIỂU</div>
          <div class="panel-body">
            <div class="speech-list">
              ${waiting.length ? waiting.map((item, index) => `
                <div class="speech-item">
                  <div class="speech-name"><span class="speech-number">${index + 1}</span>${item.name}</div>
                  <div>${item.content}</div>
                </div>
              `).join("") : `<div class="empty">Không còn đại biểu chờ phát biểu</div>`}
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <div class="notice">${config.owner}</div>
        <button onclick="document.documentElement.requestFullscreen()" class="screen-btn">Toàn màn hình</button>
      </footer>
    </div>
  `;
  updateClock();
}

function tvVoteRow(label, value) {
  return `<div class="vote-row"><span>${label}</span><span>${value}</span></div>`;
}

function attendance() {
  const present = delegates.filter((item) => item.present).length;
  return { present, total: delegates.length, absent: delegates.length - present };
}

function login() {
  const id = document.getElementById("idDaiBieu").value.trim();
  const password = document.getElementById("matKhau").value.trim();
  const user = delegates.find((item) => item.id === id && item.password === password);
  if (!user) {
    document.getElementById("loginMsg").textContent = "Sai mã đại biểu hoặc mật khẩu.";
    return;
  }
  currentUser = user;
  renderApp();
}

function logout() {
  currentUser = null;
  activeTab = "tongquan";
  renderApp();
}

function showTab(tab) {
  activeTab = tab;
  renderApp();
}

function markPresent() {
  if (currentUser) currentUser.present = true;
  renderApp();
}

function addSpeech() {
  const field = document.getElementById("speechContent");
  const content = field.value.trim();
  if (!content) {
    document.getElementById("speechMsg").textContent = "Vui lòng nhập nội dung phát biểu.";
    return;
  }
  speeches.push({ id: Date.now(), name: currentUser.name, content, done: false });
  field.value = "";
  document.getElementById("speechMsg").textContent = "Đã gửi đăng ký phát biểu.";
}

function finishSpeech(id) {
  const item = speeches.find((speech) => speech.id === id);
  if (item) item.done = true;
  renderApp();
}

function createVote() {
  const title = document.getElementById("voteTitle").value.trim();
  const content = document.getElementById("voteContent").value.trim();
  if (!title || !content) return;
  votes.push({ id: `BQ${Date.now()}`, title, content, open: true, yes: 0, no: 0, other: 0 });
  renderApp();
}

function castVote(id, choice) {
  const vote = votes.find((item) => item.id === id);
  if (vote) vote[choice] += 1;
  renderApp();
}

function updateClock() {
  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  const date = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  document.querySelectorAll("#clock").forEach((node) => {
    node.textContent = time;
  });
  document.querySelectorAll("#date").forEach((node) => {
    node.textContent = date;
  });
}

setInterval(updateClock, 1000);
