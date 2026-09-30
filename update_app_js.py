with open('js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Add bylaw state variables in App object
# Find App = {
code = code.replace('bylawFilter: "all",\n    bylawSearch: "",\n', '')
code = code.replace('mcpSearchKeyword: "",', 'mcpSearchKeyword: "",\n    bylawViewMode: "diff", // "diff", "revised", "current"\n    bylawFilter: "all",\n    bylawSearch: "",')

new_bylaws_logic = '''    // ==========================================
    // 4. 탭 3: 회칙 정리 (신구조문대비표)
    // ==========================================
    setupBylaws() {
        // 검색어 입력 이벤트
        const searchInput = document.getElementById("bylaw-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.bylawSearch = e.target.value.trim().toLowerCase();
                this.renderBylawsDiff();
            });
        }

        // 파일 업로드 설정
        const dropZone = document.getElementById("bylaws-dropzone");
        const fileInput = document.getElementById("bylaws-file-input");

        if (dropZone && fileInput) {
            dropZone.addEventListener("click", () => fileInput.click());

            dropZone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropZone.classList.add("border-blue-500", "bg-blue-50/50");
            });

            dropZone.addEventListener("dragleave", () => {
                dropZone.classList.remove("border-blue-500", "bg-blue-50/50");
            });

            dropZone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropZone.classList.remove("border-blue-500", "bg-blue-50/50");
                if (e.dataTransfer.files.length) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });

            fileInput.addEventListener("change", (e) => {
                if (e.target.files.length) {
                    this.handleFiles(e.target.files);
                }
            });
        }
    },

    setBylawViewMode(mode) {
        this.bylawViewMode = mode;
        const diffBtn = document.getElementById("bylaw-view-diff-btn");
        const revBtn = document.getElementById("bylaw-view-revised-btn");
        const curBtn = document.getElementById("bylaw-view-current-btn");

        [diffBtn, revBtn, curBtn].forEach(btn => {
            if (btn) {
                btn.className = "px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1.5";
            }
        });

        if (mode === "diff" && diffBtn) {
            diffBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white transition flex items-center space-x-1.5 shadow-sm";
        } else if (mode === "revised" && revBtn) {
            revBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white transition flex items-center space-x-1.5 shadow-sm";
        } else if (mode === "current" && curBtn) {
            curBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-white transition flex items-center space-x-1.5 shadow-sm";
        }

        this.renderBylawsDiff();
    },

    filterBylaws(filterType) {
        this.bylawFilter = filterType;
        const chips = document.querySelectorAll(".bylaw-filter-chip");
        chips.forEach(chip => {
            chip.classList.remove("bg-slate-900", "text-white");
            chip.classList.add("bg-white", "text-slate-600");
        });
        // Highlight active chip
        event.target.closest("button").classList.add("bg-slate-900", "text-white");
        event.target.closest("button").classList.remove("bg-white", "text-slate-600");

        this.renderBylawsDiff();
    },

    renderBylawsDiff() {
        const container = document.getElementById("bylaws-diff-container");
        if (!container || typeof BYLAWS_COMPILATION === "undefined") return;

        let articles = BYLAWS_COMPILATION.articles;

        // 필터링 적용
        if (this.bylawFilter === "important") {
            articles = articles.filter(a => a.isImportant);
        } else if (this.bylawFilter === "new") {
            articles = articles.filter(a => a.changeType.includes("신설"));
        } else if (this.bylawFilter !== "all") {
            articles = articles.filter(a => a.chapter === this.bylawFilter);
        }

        // 검색어 필터링
        if (this.bylawSearch) {
            articles = articles.filter(a => 
                a.title.toLowerCase().includes(this.bylawSearch) ||
                a.summary.toLowerCase().includes(this.bylawSearch) ||
                a.current.toLowerCase().includes(this.bylawSearch) ||
                a.revised.toLowerCase().includes(this.bylawSearch) ||
                a.reason.toLowerCase().includes(this.bylawSearch)
            );
        }

        const badgeCount = document.getElementById("bylaw-count-badge");
        if (badgeCount) {
            badgeCount.textContent = `${articles.length}개 조항 표시 중`;
        }

        if (articles.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i data-lucide="search-x" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                    <p class="text-sm font-semibold">검색 조건에 일치하는 조항이 없습니다.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = articles.map((art, idx) => {
            const isDiff = this.bylawViewMode === "diff";
            const isRevisedOnly = this.bylawViewMode === "revised";
            const isCurrentOnly = this.bylawViewMode === "current";

            return `
                <div class="diff-card bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <!-- 헤더: 장/조 및 핵심 변경 요약 배지 -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div class="flex items-center space-x-2.5">
                            <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                                ${art.chapter}
                            </span>
                            <h4 class="font-black text-slate-900 text-base sm:text-lg">
                                ${art.title}
                            </h4>
                            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${art.badgeColor}">
                                ${art.changeType}
                            </span>
                        </div>
                        <div class="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                            💡 핵심: ${art.summary}
                        </div>
                    </div>

                    <!-- 본문: 신구 대비표 or 단일 뷰 -->
                    ${isDiff ? `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- 좌측: 기존 내용 (현행) -->
                            <div class="diff-box-current p-4 space-y-2">
                                <div class="flex items-center justify-between pb-1.5 border-b border-rose-200">
                                    <span class="text-xs font-extrabold text-rose-800 flex items-center gap-1">
                                        <i data-lucide="minus-circle" class="w-3.5 h-3.5 text-rose-500"></i>
                                        종전 내용 (현행 조문)
                                    </span>
                                    <span class="text-[10px] text-rose-600 font-semibold">개정 전</span>
                                </div>
                                <div class="text-xs leading-relaxed text-slate-700 whitespace-pre-line font-normal">
                                    ${art.current}
                                </div>
                            </div>

                            <!-- 우측: 변경 내용 (개정안) -->
                            <div class="diff-box-revised p-4 space-y-2">
                                <div class="flex items-center justify-between pb-1.5 border-b border-blue-200">
                                    <span class="text-xs font-extrabold text-blue-800 flex items-center gap-1">
                                        <i data-lucide="check-circle" class="w-3.5 h-3.5 text-blue-600"></i>
                                        변경 내용 (제6기 개정안)
                                    </span>
                                    <span class="text-[10px] text-blue-600 font-semibold">개정안</span>
                                </div>
                                <div class="text-xs leading-relaxed text-slate-900 whitespace-pre-line font-medium">
                                    ${art.revised}
                                </div>
                            </div>
                        </div>
                    ` : isRevisedOnly ? `
                        <!-- 개정안 전문 모드 -->
                        <div class="diff-box-revised p-5 space-y-2">
                            <span class="text-xs font-extrabold text-blue-800 block pb-1 border-b border-blue-200">
                                제6기 개정안 조문
                            </span>
                            <div class="text-xs leading-relaxed text-slate-900 whitespace-pre-line font-medium">
                                ${art.revised}
                            </div>
                        </div>
                    ` : `
                        <!-- 현행 전문 모드 -->
                        <div class="diff-box-current p-5 space-y-2">
                            <span class="text-xs font-extrabold text-rose-800 block pb-1 border-b border-rose-200">
                                종전 현행 조문
                            </span>
                            <div class="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                                ${art.current}
                            </div>
                        </div>
                    `}

                    <!-- 하단: 개정 사유 및 법령 검토 근거 -->
                    <div class="pt-3 border-t border-slate-100">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
                            <div class="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-[11px]">
                                <i data-lucide="info" class="w-3.5 h-3.5 text-indigo-600"></i>
                                <span>개정 사유 및 법령 근거 (검토 의견)</span>
                            </div>
                            <p class="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">
                                ${art.reason}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        lucide.createIcons();
    },
'''

# Replace setupBylaws and associated methods in app.js
import re
p = re.compile(r'// =+\s*// 4\. 탭 3: 회칙 정리\s*// =+\s*setupBylaws\(\) \{.*?renderUploadedFilesList\(\);', re.DOTALL)
if p.search(code):
    code = p.sub(new_bylaws_logic + "\n        this.renderBylawsDiff();\n        this.renderUploadedFilesList();", code)
    print("Replaced bylaws logic via regex successfully!")
else:
    print("Could not match exact bylaws block, appending...")

# Also update renderAll to call renderBylawsDiff
if 'this.renderBylawsDiff();' not in code:
    code = code.replace('renderAll() {', 'renderAll() {\n        this.renderBylawsDiff();')

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated js/app.js successfully!")
