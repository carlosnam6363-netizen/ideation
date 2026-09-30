/**
 * 화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 메인 애플리케이션 로직
 * (성능 최적화, 디바운스 검색, XSS 방지, 메모리 누수 방지 적용)
 */

// 유틸리티 함수: HTML 이스케이프 (XSS 방지)
const escapeHtml = (str) => {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// 유틸리티 함수: 디바운스
const debounce = (func, wait = 150) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

const App = {
    currentTab: "tab-1",
    currentStep: 1,
    selectedTrack: "track-1",
    programs: [],
    selectedProposalIndex: 0,
    uploadedBylawsFiles: [],
    padletViewMode: "columns", // "columns" or "grid"
    filterCategory: "all",
    searchKeyword: "",
    mcpCategoryFilter: "all",
    mcpSearchKeyword: "",
    bylawViewMode: "diff", // "diff", "revised", "current"
    bylawFilter: "all",
    bylawSearch: "",
    chartInstance: null,
    iconDebounceTimer: null,

    init() {
        this.loadStorage();
        this.setupNavigation();
        this.setupPadlet();
        this.setupIdeation();
        this.setupBylaws();
        this.renderAll();
        this.updateIcons();
    },

    // Lucide 아이콘 렌더링 최적화 (배치 처리)
    updateIcons() {
        if (typeof lucide === "undefined") return;
        if (this.iconDebounceTimer) cancelAnimationFrame(this.iconDebounceTimer);
        this.iconDebounceTimer = requestAnimationFrame(() => {
            lucide.createIcons();
            this.iconDebounceTimer = null;
        });
    },

    // 로컬스토리지 불러오기 및 초기화
    loadStorage() {
        try {
            const savedPrograms = localStorage.getItem("dongtan_padlet_programs");
            this.programs = savedPrograms ? JSON.parse(savedPrograms) : [...DONGTAN_DATA.initialPrograms];
        } catch {
            this.programs = [...DONGTAN_DATA.initialPrograms];
        }

        try {
            const savedFiles = localStorage.getItem("dongtan_bylaws_files");
            this.uploadedBylawsFiles = savedFiles ? JSON.parse(savedFiles) : [];
        } catch {
            this.uploadedBylawsFiles = [];
        }
    },

    savePrograms() {
        try {
            localStorage.setItem("dongtan_padlet_programs", JSON.stringify(this.programs));
        } catch (e) {
            console.warn("로컬스토리지 저장 용량 초과 또는 권한 문제:", e);
        }
    },

    saveFiles() {
        try {
            localStorage.setItem("dongtan_bylaws_files", JSON.stringify(this.uploadedBylawsFiles));
        } catch (e) {
            console.warn("로컬스토리지 파일 목록 저장 실패:", e);
        }
    },

    // 1. 상단 내비게이션 탭 설정
    setupNavigation() {
        const tabBtns = document.querySelectorAll(".nav-tab-btn");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                if (targetTab) this.switchTab(targetTab);
            });
        });
    },

    switchTab(tabId) {
        if (this.currentTab === tabId) return;
        this.currentTab = tabId;

        document.querySelectorAll(".nav-tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
        });

        document.querySelectorAll(".tab-content-panel").forEach(panel => {
            const isTarget = panel.id === tabId;
            panel.classList.toggle("hidden", !isTarget);
            if (isTarget) {
                panel.classList.remove("fade-in-scale");
                void panel.offsetWidth; // trigger reflow
                panel.classList.add("fade-in-scale");
            }
        });

        if (tabId === "tab-2" && this.currentStep === 1) {
            this.renderSurveyChart();
        } else if (tabId === "tab-3") {
            this.renderBylawsDiff();
        }
        this.updateIcons();
    },

    // ==========================================
    // 2. 탭 1: 패들렛 (2027 교육 프로그램 취합)
    // ==========================================
    setupPadlet() {
        const viewColsBtn = document.getElementById("view-columns-btn");
        const viewGridBtn = document.getElementById("view-grid-btn");

        if (viewColsBtn && viewGridBtn) {
            viewColsBtn.addEventListener("click", () => {
                if (this.padletViewMode === "columns") return;
                this.padletViewMode = "columns";
                viewColsBtn.classList.replace("bg-white", "bg-blue-600");
                viewColsBtn.classList.replace("text-slate-700", "text-white");
                viewGridBtn.classList.replace("bg-blue-600", "bg-white");
                viewGridBtn.classList.replace("text-white", "text-slate-700");
                this.renderPadletBoard();
            });

            viewGridBtn.addEventListener("click", () => {
                if (this.padletViewMode === "grid") return;
                this.padletViewMode = "grid";
                viewGridBtn.classList.replace("bg-white", "bg-blue-600");
                viewGridBtn.classList.replace("text-slate-700", "text-white");
                viewColsBtn.classList.replace("bg-blue-600", "bg-white");
                viewColsBtn.classList.replace("text-white", "text-slate-700");
                this.renderPadletBoard();
            });
        }

        // 카테고리 필터
        const filterBtns = document.querySelectorAll(".padlet-cat-filter");
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterBtns.forEach(b => {
                    b.classList.remove("bg-slate-900", "text-white");
                    b.classList.add("bg-white", "text-slate-600");
                });
                btn.classList.add("bg-slate-900", "text-white");
                btn.classList.remove("bg-white", "text-slate-600");
                this.filterCategory = btn.getAttribute("data-cat") || "all";
                this.renderPadletBoard();
            });
        });

        // 검색어 입력 (디바운스 적용)
        const searchInput = document.getElementById("padlet-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", debounce((e) => {
                this.searchKeyword = e.target.value.trim().toLowerCase();
                this.renderPadletBoard();
            }, 120));
        }

        // 프로그램 신규 등록 모달
        const openModalBtn = document.getElementById("open-program-modal-btn");
        const closeModalBtn = document.getElementById("close-program-modal-btn");
        const modal = document.getElementById("program-modal");
        const form = document.getElementById("new-program-form");

        if (openModalBtn && modal) {
            openModalBtn.addEventListener("click", () => {
                this.populateMemberSelect();
                modal.classList.remove("hidden");
                modal.classList.add("flex");
            });
        }

        if (closeModalBtn && modal) {
            closeModalBtn.addEventListener("click", () => {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            });
        }

        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleCreateProgram(form);
            });
        }

        // 엑셀(CSV) 내보내기 버튼
        const exportBtn = document.getElementById("export-programs-csv-btn");
        if (exportBtn) {
            exportBtn.addEventListener("click", () => this.exportProgramsToCSV());
        }
    },

    populateMemberSelect() {
        const select = document.getElementById("program-member-select");
        if (!select || select.children.length > 0) return;
        select.innerHTML = DONGTAN_DATA.members.map(m => 
            `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.role)} - ${escapeHtml(m.field)})</option>`
        ).join("");
    },

    handleCreateProgram(form) {
        const memberId = parseInt(form.elements["memberId"].value, 10);
        const member = DONGTAN_DATA.members.find(m => m.id === memberId) || DONGTAN_DATA.members[0];
        const title = form.elements["title"].value.trim();
        const category = form.elements["category"].value;
        const format = form.elements["format"].value.trim();
        const target = form.elements["target"].value.trim();
        const schedule = form.elements["schedule"].value.trim();
        const institution = form.elements["institution"].value.trim();
        const purpose = form.elements["purpose"].value.trim();
        const tagsInput = form.elements["tags"].value.trim();
        const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : ["2027교육"];

        if (!title || !purpose) {
            alert("프로그램명과 필요 이유/추진 목적을 입력해주세요.");
            return;
        }

        const newProg = {
            id: "prog-" + Date.now(),
            memberId: memberId,
            author: `${member.name} (${member.role})`,
            title: title,
            category: category,
            format: format || "오프라인 실무",
            target: target || "동탄 청년",
            schedule: schedule || "2027년 중",
            institution: institution || "화성시 및 전문기관",
            purpose: purpose,
            likes: 1,
            status: "제안됨",
            tags: tags,
            comments: []
        };

        this.programs.unshift(newProg);
        this.savePrograms();
        this.renderPadletBoard();

        const modal = document.getElementById("program-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
        form.reset();

        alert("2027년 교육 프로그램 제안이 패들렛에 성공적으로 등록되었습니다!");
    },

    renderPadletBoard() {
        const container = document.getElementById("padlet-board-container");
        if (!container) return;

        const kw = this.searchKeyword;
        const cat = this.filterCategory;

        const filtered = this.programs.filter(p => {
            const matchesCat = cat === "all" || p.category === cat;
            if (!matchesCat) return false;
            if (!kw) return true;
            return (
                p.title.toLowerCase().includes(kw) ||
                p.author.toLowerCase().includes(kw) ||
                p.purpose.toLowerCase().includes(kw) ||
                p.tags.some(t => t.toLowerCase().includes(kw))
            );
        });

        // 1. 컬럼별 뷰
        if (this.padletViewMode === "columns") {
            container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6 overflow-x-auto";
            
            container.innerHTML = DONGTAN_DATA.members.map(member => {
                const memberPrograms = filtered.filter(p => p.memberId === member.id);
                return `
                    <div class="padlet-column p-4 flex flex-col">
                        <div class="flex items-center space-x-3 mb-4 p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${member.color} text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                                ${escapeHtml(member.name.slice(0, 2))}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center space-x-2">
                                    <h4 class="font-bold text-slate-800 text-sm truncate">${escapeHtml(member.name)}</h4>
                                    <span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${member.role.includes('분과장') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                                        ${escapeHtml(member.role)}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-500 truncate" title="${escapeHtml(member.field)}">${escapeHtml(member.field)}</p>
                            </div>
                            <span class="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                ${memberPrograms.length}건
                            </span>
                        </div>

                        <div class="space-y-3.5 flex-1 overflow-y-auto pr-1">
                            ${memberPrograms.length === 0 ? `
                                <div class="h-40 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                    <i data-lucide="book-plus" class="w-6 h-6 mb-1 text-slate-300"></i>
                                    <p class="text-xs">등록된 필요 교육이 없습니다.</p>
                                    <button onclick="App.openModalForMember(${member.id})" class="mt-2 text-xs font-semibold text-blue-600 hover:underline">
                                        + 교육 프로그램 제안
                                    </button>
                                </div>
                            ` : memberPrograms.map(prog => this.renderPadletCardHTML(prog)).join("")}
                        </div>
                    </div>
                `;
            }).join("");
        } 
        // 2. 통합 그리드 뷰
        else {
            container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6";
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full py-16 text-center text-slate-400">
                        <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-slate-300"></i>
                        <p class="text-base font-medium">검색 조건에 맞는 교육 프로그램이 없습니다.</p>
                    </div>
                `;
            } else {
                container.innerHTML = filtered.map(prog => this.renderPadletCardHTML(prog)).join("");
            }
        }

        this.updateIcons();
    },

    renderPadletCardHTML(prog) {
        const catBadgeColors = {
            "교육": "bg-blue-100 text-blue-800 border-blue-200",
            "참여": "bg-emerald-100 text-emerald-800 border-emerald-200",
            "권리": "bg-purple-100 text-purple-800 border-purple-200"
        };
        const statusBadge = {
            "2027 확정안": "bg-green-100 text-green-700 border-green-300",
            "협의중": "bg-amber-100 text-amber-700 border-amber-300",
            "제안됨": "bg-slate-100 text-slate-600 border-slate-200"
        };

        return `
            <div class="padlet-card p-4 flex flex-col justify-between" id="${escapeHtml(prog.id)}">
                <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <span class="text-[11px] px-2 py-0.5 font-bold rounded border ${catBadgeColors[prog.category] || 'bg-slate-100 text-slate-700'}">
                            ${escapeHtml(prog.category)}
                        </span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusBadge[prog.status] || ''}">
                            ${escapeHtml(prog.status)}
                        </span>
                    </div>

                    <h4 class="font-bold text-slate-900 text-sm leading-snug mb-2 hover:text-blue-600 cursor-pointer">
                        ${escapeHtml(prog.title)}
                    </h4>

                    <p class="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                        ${escapeHtml(prog.purpose)}
                    </p>

                    <div class="space-y-1 text-[11px] text-slate-500 mb-3">
                        <div class="flex items-center space-x-1 truncate">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                            <span class="truncate">일정: ${escapeHtml(prog.schedule)}</span>
                        </div>
                        <div class="flex items-center space-x-1 truncate">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                            <span class="truncate">방식: ${escapeHtml(prog.format)} | ${escapeHtml(prog.target)}</span>
                        </div>
                        <div class="flex items-center space-x-1 truncate">
                            <i data-lucide="building" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                            <span class="truncate">추천기관: ${escapeHtml(prog.institution)}</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-1 mb-3">
                        ${(prog.tags || []).map(t => `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#${escapeHtml(t)}</span>`).join("")}
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium truncate max-w-[120px]">
                        ✍️ ${escapeHtml(prog.author)}
                    </span>
                    <div class="flex items-center space-x-2">
                        <button onclick="App.handleVote('${escapeHtml(prog.id)}')" class="flex items-center space-x-1 px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold transition">
                            <i data-lucide="heart" class="w-3.5 h-3.5 fill-rose-500"></i>
                            <span>${prog.likes || 0}</span>
                        </button>
                        <button onclick="App.openCommentModal('${escapeHtml(prog.id)}')" class="flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                            <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                            <span>${(prog.comments || []).length}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    openModalForMember(memberId) {
        this.populateMemberSelect();
        const select = document.getElementById("program-member-select");
        if (select) select.value = memberId;
        const modal = document.getElementById("program-modal");
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }
    },

    handleVote(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (prog) {
            prog.likes = (prog.likes || 0) + 1;
            this.savePrograms();
            this.renderPadletBoard();
        }
    },

    openCommentModal(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        const commentsSummary = (prog.comments || []).map(c => `• ${c.user}: ${c.text}`).join("\n") || "등록된 의견 없음";
        const newComment = prompt(`[${prog.title}]\n\n현재 등록된 의견:\n${commentsSummary}\n\n새로운 의견이나 보완점을 작성해주세요:\n(예: 이름: 의견내용)`);
        
        if (newComment && newComment.trim()) {
            const parts = newComment.split(":");
            let author = "익명 위원";
            let text = newComment.trim();
            if (parts.length > 1) {
                author = parts[0].trim();
                text = parts.slice(1).join(":").trim();
            }
            if (!prog.comments) prog.comments = [];
            prog.comments.push({ user: author, text: text });
            this.savePrograms();
            this.renderPadletBoard();
        }
    },

    exportProgramsToCSV() {
        const headers = ["번호", "제안자", "분야", "프로그램명", "교육방식", "교육대상", "예상일정", "추천기관", "추진목적", "상태", "추천수"];
        const rows = this.programs.map((p, idx) => [
            idx + 1,
            `"${(p.author || '').replace(/"/g, '""')}"`,
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.format || '').replace(/"/g, '""')}"`,
            `"${(p.target || '').replace(/"/g, '""')}"`,
            `"${(p.schedule || '').replace(/"/g, '""')}"`,
            `"${(p.institution || '').replace(/"/g, '""')}"`,
            `"${(p.purpose || '').replace(/"/g, '""')}"`,
            `"${(p.status || '').replace(/"/g, '""')}"`,
            p.likes || 0
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `화성시_동탄구_2027교육프로그램취합목록_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    // ==========================================
    // 3. 탭 2: 아이디에이션 5단계 워크플로우
    // ==========================================
    setupIdeation() {
        // 스텝 2 트랙 선택 이벤트
        const trackCards = document.querySelectorAll(".specialty-track-card");
        trackCards.forEach(card => {
            card.addEventListener("click", () => {
                trackCards.forEach(c => {
                    c.classList.remove("border-blue-600", "ring-2", "ring-blue-500", "bg-blue-50/50");
                    c.classList.add("border-slate-200");
                });
                card.classList.add("border-blue-600", "ring-2", "ring-blue-500", "bg-blue-50/50");
                card.classList.remove("border-slate-200");

                this.selectedTrack = card.getAttribute("data-track") || "track-1";
                this.renderMcpPolicyList();
            });
        });

        // 온통청년 MCP 정책 검색 & 필터 (디바운스 적용)
        const mcpSearch = document.getElementById("mcp-search-input");
        if (mcpSearch) {
            mcpSearch.addEventListener("input", debounce((e) => {
                this.mcpSearchKeyword = e.target.value.trim().toLowerCase();
                this.renderMcpPolicyList();
            }, 120));
        }

        const mcpFilters = document.querySelectorAll(".mcp-cat-filter");
        mcpFilters.forEach(btn => {
            btn.addEventListener("click", () => {
                mcpFilters.forEach(b => {
                    b.classList.remove("bg-blue-600", "text-white");
                    b.classList.add("bg-slate-100", "text-slate-700");
                });
                btn.classList.add("bg-blue-600", "text-white");
                btn.classList.remove("bg-slate-100", "text-slate-700");
                this.mcpCategoryFilter = btn.getAttribute("data-cat") || "all";
                this.renderMcpPolicyList();
            });
        });
    },

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > 5) return;
        const prevStep = this.currentStep;
        this.currentStep = stepNumber;

        // 인디케이터 업데이트
        for (let i = 1; i <= 5; i++) {
            const stepBtn = document.getElementById(`step-indicator-${i}`);
            const line = document.getElementById(`step-line-${i}`);
            if (stepBtn) {
                if (i === stepNumber) {
                    stepBtn.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-blue-600 text-white shadow-lg ring-4 ring-blue-100 transition-all";
                } else if (i < stepNumber) {
                    stepBtn.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-500 text-white transition-all";
                } else {
                    stepBtn.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-100 text-slate-400 border border-slate-200 transition-all";
                }
            }
            if (line && i < 5) {
                line.className = i < stepNumber ? "flex-1 h-1 bg-emerald-500 transition-all" : "flex-1 h-1 bg-slate-200 transition-all";
            }
        }

        // 스텝 패널 전환
        const animClass = stepNumber > prevStep ? "step-anim-next" : "step-anim-prev";
        for (let i = 1; i <= 5; i++) {
            const panel = document.getElementById(`ideation-step-${i}`);
            if (panel) {
                if (i === stepNumber) {
                    panel.classList.remove("hidden");
                    panel.classList.remove("step-anim-next", "step-anim-prev");
                    void panel.offsetWidth; // trigger reflow
                    panel.classList.add(animClass);
                } else {
                    panel.classList.add("hidden");
                }
            }
        }

        // 스텝별 특정 로직
        if (stepNumber === 1) {
            this.renderSurveyChart();
        } else if (stepNumber === 3) {
            this.renderMcpPolicyList();
        } else if (stepNumber === 5) {
            this.renderProposalSelector();
            this.loadProposal(this.selectedProposalIndex);
        }

        document.getElementById("tab-2")?.scrollIntoView({ behavior: "smooth" });
        this.updateIcons();
    },

    // Step 1: 설문조사 차트 렌더링 (메모리 누수 방지 및 파괴 후 재생성)
    renderSurveyChart() {
        const canvas = document.getElementById("surveyChart");
        if (!canvas) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const ctx = canvas.getContext("2d");
        this.chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: DONGTAN_DATA.surveyData.chartLabels,
                datasets: [{
                    label: "도움 필요 응답률 (%)",
                    data: DONGTAN_DATA.surveyData.chartData,
                    backgroundColor: [
                        "rgba(37, 99, 235, 0.85)",
                        "rgba(124, 58, 237, 0.85)",
                        "rgba(13, 148, 136, 0.85)",
                        "rgba(16, 185, 129, 0.85)",
                        "rgba(245, 158, 11, 0.85)",
                        "rgba(59, 130, 246, 0.85)"
                    ],
                    borderRadius: 6,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` 청년 체감 필요도: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: { color: "#F1F5F9" },
                        ticks: { callback: v => v + "%" }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { weight: "600" } }
                    }
                }
            }
        });
    },

    // Step 3: 온통청년 MCP 정책 목록 렌더링
    renderMcpPolicyList() {
        const container = document.getElementById("mcp-policy-list");
        if (!container) return;

        const currentTrack = DONGTAN_DATA.specialtyTracks.find(t => t.id === this.selectedTrack);
        const trackTitleBadge = document.getElementById("mcp-selected-track-badge");
        if (trackTitleBadge && currentTrack) {
            trackTitleBadge.textContent = `선택된 전문 분야: ${currentTrack.title}`;
        }

        const kw = this.mcpSearchKeyword;
        const cat = this.mcpCategoryFilter;

        const filtered = DONGTAN_DATA.ontongPolicies.filter(p => {
            const matchesCategory = cat === "all" || p.category.includes(cat);
            if (!matchesCategory) return false;
            if (!kw) return true;
            return (
                p.title.toLowerCase().includes(kw) ||
                p.agency.toLowerCase().includes(kw) ||
                p.region.toLowerCase().includes(kw) ||
                p.content.toLowerCase().includes(kw)
            );
        });

        filtered.sort((a, b) => (b.track === this.selectedTrack ? 1 : 0) - (a.track === this.selectedTrack ? 1 : 0));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    <p>선택한 조건에 맞는 온통청년 정책이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(p => {
            const isTrackMatch = p.track === this.selectedTrack;
            const hasValidUrl = p.url && !p.url.includes("URL 없음");

            return `
                <div class="bg-white p-5 rounded-xl border ${isTrackMatch ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 shadow-sm'} flex flex-col justify-between hover:shadow-md transition">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                ${escapeHtml(p.category)}
                            </span>
                            <span class="text-[11px] font-semibold px-2 py-0.5 rounded ${p.region.includes('화성') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                                ${escapeHtml(p.region)}
                            </span>
                        </div>

                        <h4 class="font-bold text-slate-900 text-sm leading-snug hover:text-blue-600 mb-1.5">
                            ${escapeHtml(p.title)}
                        </h4>

                        <p class="text-[11px] text-slate-500 mb-2">
                            주관: <span class="text-slate-700 font-medium">${escapeHtml(p.agency)}</span> | 대상: ${escapeHtml(p.target)}
                        </p>

                        <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg mb-3 border border-slate-100">
                            ${escapeHtml(p.content)}
                        </p>

                        <div class="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-900 mb-3">
                            <span class="font-bold flex items-center gap-1 text-[11px] text-blue-700 mb-0.5">
                                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-blue-600"></i>
                                우리 분과 MCP 연계 착안점
                            </span>
                            <p class="text-[11px] text-slate-700 leading-normal">${escapeHtml(p.mcpMatch)}</p>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-[10px] text-slate-400 font-mono">ID: ${escapeHtml(p.id)}</span>
                        ${hasValidUrl ? `
                            <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-xs">
                                <span>원문 정책 보기</span>
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                            </a>
                        ` : `
                            <span class="text-slate-400 text-xs">공개 원문 미기재</span>
                        `}
                    </div>
                </div>
            `;
        }).join("");

        this.updateIcons();
    },

    toggleMcpListDetails() {
        const content = document.getElementById("mcp-details-content");
        const icon = document.getElementById("mcp-toggle-icon");
        const text = document.getElementById("mcp-toggle-text");
        if (!content) return;

        const isHidden = content.classList.contains("hidden");
        if (isHidden) {
            content.classList.remove("hidden");
            if (icon) icon.style.transform = "rotate(180deg)";
            if (text) text.textContent = "상세 정책 목록 닫기";
            this.renderMcpPolicyList();
        } else {
            content.classList.add("hidden");
            if (icon) icon.style.transform = "rotate(0deg)";
            if (text) text.textContent = "상세 정책 목록 열기";
        }
    },

    renderProposalSelector() {
        const listContainer = document.getElementById("proposal-cards-list");
        if (!listContainer) return;

        listContainer.innerHTML = DONGTAN_DATA.recommendedPolicies.map((p, idx) => {
            const isSelected = idx === this.selectedProposalIndex;
            return `
                <div onclick="App.loadProposal(${idx})" class="cursor-pointer p-4 rounded-xl border transition-all ${isSelected ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300 shadow-sm'}">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            추천 제안 ${escapeHtml(p.num)}
                        </span>
                        <span class="text-xs text-slate-500 font-medium truncate max-w-[140px]">${escapeHtml(p.field)}</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">${escapeHtml(p.title)}</h4>
                    <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">${escapeHtml(p.summary)}</p>
                </div>
            `;
        }).join("");
    },

    loadProposal(index) {
        this.selectedProposalIndex = index;
        this.renderProposalSelector();
        const p = DONGTAN_DATA.recommendedPolicies[index];
        if (!p) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
        };

        setVal("form-division", p.division || "동탄구 교육, 참여, 권리 분과");
        setVal("form-title", p.title || "");
        setVal("form-basis", p.basis || "");
        setVal("form-ref-policy", p.refPolicy || "");
        setVal("form-problems", p.problems || "");
        setVal("form-solutions", p.solutions || "");
        setVal("form-details", p.details || "");
        setVal("form-effects", p.effects || "");
    },

    getProposalFormData() {
        const getVal = (id) => (document.getElementById(id)?.value || "").trim();
        return {
            division: getVal("form-division") || "동탄구 교육, 참여, 권리 분과",
            title: getVal("form-title") || "무제 정책 제안",
            basis: getVal("form-basis"),
            refPolicy: getVal("form-ref-policy"),
            problems: getVal("form-problems"),
            solutions: getVal("form-solutions"),
            details: getVal("form-details"),
            effects: getVal("form-effects")
        };
    },

    // 한글(HWP) 및 워드(DOCX) 파일 생성 공통 테이블 빌더
    generateDocumentHTML(data, isWord = false) {
        const safeTitle = escapeHtml(data.title);
        const fontStack = isWord ? `'Malgun Gothic', '맑은 고딕', Arial, sans-serif` : `'맑은 고딕', 'Malgun Gothic', '한컴바탕', Batang, sans-serif`;

        return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
${isWord ? `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->` : ''}
<style>
  @page { size: 21.0cm 29.7cm; margin: 2.5cm 2.0cm 2.0cm 2.0cm; }
  body { font-family: ${fontStack}; font-size: 11pt; line-height: 1.6; color: #000; }
  h1 { text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 25px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1pt solid #000000; padding: 8pt 10pt; font-size: 11pt; vertical-align: middle; }
  th { background-color: #F1F5F9; font-weight: bold; text-align: center; width: 130px; }
  .content-text { white-space: pre-wrap; font-size: 10.5pt; color: #1E293B; }
  .footer { text-align: right; margin-top: 25px; font-size: 11pt; font-weight: bold; }
</style>
</head>
<body>
  <h1>화성시 청년정책협의체 정책 제안서</h1>
  <table>
    <tr>
      <th>분 과 명</th>
      <td colspan="2"><div class="content-text">${escapeHtml(data.division)}</div></td>
    </tr>
    <tr>
      <th>제 안 명</th>
      <td colspan="2"><div class="content-text" style="font-weight: bold; font-size: 13pt; color: #1E40AF;">${safeTitle}</div></td>
    </tr>
    <tr>
      <th>추진근거</th>
      <td colspan="2"><div class="content-text">${escapeHtml(data.basis)}</div></td>
    </tr>
    <tr>
      <th>참고정책</th>
      <td colspan="2"><div class="content-text">${escapeHtml(data.refPolicy)}</div></td>
    </tr>
    <tr>
      <th rowspan="2">제안배경<br>및<br>필요성</th>
      <th style="width: 120px; background-color: #FFF1F2; color: #9F1239;">현황과 문제점</th>
      <td><div class="content-text">${escapeHtml(data.problems)}</div></td>
    </tr>
    <tr>
      <th style="width: 120px; background-color: #EFF6FF; color: #1E40AF;">개선방안</th>
      <td><div class="content-text">${escapeHtml(data.solutions)}</div></td>
    </tr>
    <tr>
      <th>제안내용</th>
      <td colspan="2"><div class="content-text">${escapeHtml(data.details)}</div></td>
    </tr>
    <tr>
      <th>기대효과</th>
      <td colspan="2"><div class="content-text">${escapeHtml(data.effects)}</div></td>
    </tr>
  </table>
  <div class="footer">
    화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동
  </div>
</body>
</html>`;
    },

    exportToHWP() {
        const data = this.getProposalFormData();
        const safeFileTitle = data.title.replace(/[\/\\:*?"<>|]/g, "_");
        const html = this.generateDocumentHTML(data, false);
        const blob = new Blob(["\ufeff" + html], { type: "application/x-hwp;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeFileTitle}.hwp`;
        link.click();
        URL.revokeObjectURL(link.href);
        alert(`한글(HWP) 파일이 성공적으로 다운로드되었습니다!\n한컴오피스 한글에서 완벽한 표 서식으로 열립니다.`);
    },

    exportToDOCX() {
        const data = this.getProposalFormData();
        const safeFileTitle = data.title.replace(/[\/\\:*?"<>|]/g, "_");
        const html = this.generateDocumentHTML(data, true);
        const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeFileTitle}.doc`;
        link.click();
        URL.revokeObjectURL(link.href);
        alert(`워드(DOCX) 호환 문서가 성공적으로 다운로드되었습니다!\nMS Word 및 한글 오피스에서 완벽하게 표 양식이 유지됩니다.`);
    },

    copyProposalToClipboard() {
        const data = this.getProposalFormData();
        const text = `[제5기 화성시 청년정책협의체 정책 제안서]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 분 과 명 : ${data.division}
■ 제 안 명 : ${data.title}
■ 추진근거 : ${data.basis}
■ 참고정책 : ${data.refPolicy}
─────────────────────────────────────────────────────────
[제안배경 및 필요성]
● 현황과 문제점:
${data.problems}

● 개선방안:
${data.solutions}
─────────────────────────────────────────────────────────
[제안내용]
${data.details}
─────────────────────────────────────────────────────────
[기대효과]
${data.effects}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동
`;

        navigator.clipboard.writeText(text).then(() => {
            alert("공식 양식에 맞춘 정책제안서 전문이 클립보드에 복사되었습니다!\n한글 또는 워드에 바로 붙여넣기 하실 수 있습니다.");
        }).catch(() => {
            alert("클립보드 복사에 실패했습니다. 텍스트를 직접 복사해주세요.");
        });
    },

    printProposal() {
        window.print();
    },

    // ==========================================
    // 4. 탭 3: 회칙 정리 (신구조문대비표)
    // ==========================================
    setupBylaws() {
        const searchInput = document.getElementById("bylaw-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", debounce((e) => {
                this.bylawSearch = e.target.value.trim().toLowerCase();
                this.renderBylawsDiff();
            }, 120));
        }

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
                if (e.dataTransfer?.files.length) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });

            fileInput.addEventListener("change", (e) => {
                if (e.target.files?.length) {
                    this.handleFiles(e.target.files);
                }
            });
        }
    },

    setBylawViewMode(mode) {
        if (this.bylawViewMode === mode) return;
        this.bylawViewMode = mode;

        const modes = {
            diff: { id: "bylaw-view-diff-btn", activeClass: "bg-blue-600 text-white font-bold shadow-sm" },
            revised: { id: "bylaw-view-revised-btn", activeClass: "bg-indigo-600 text-white font-bold shadow-sm" },
            current: { id: "bylaw-view-current-btn", activeClass: "bg-slate-800 text-white font-bold shadow-sm" }
        };

        const defaultClass = "px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1.5";

        Object.keys(modes).forEach(k => {
            const btn = document.getElementById(modes[k].id);
            if (!btn) return;
            if (k === mode) {
                btn.className = `${defaultClass} ${modes[k].activeClass}`;
            } else {
                btn.className = defaultClass;
            }
        });

        this.renderBylawsDiff();
    },

    filterBylaws(filterType, element) {
        this.bylawFilter = filterType;
        const chips = document.querySelectorAll(".bylaw-filter-chip");
        chips.forEach(chip => {
            chip.classList.remove("bg-slate-900", "text-white");
            chip.classList.add("bg-white", "text-slate-600");
        });

        const activeChip = element || Array.from(chips).find(c => c.getAttribute("data-bylaw-filter") === filterType);
        if (activeChip) {
            activeChip.classList.add("bg-slate-900", "text-white");
            activeChip.classList.remove("bg-white", "text-slate-600");
        }

        this.renderBylawsDiff();
    },

    renderBylawsDiff() {
        const container = document.getElementById("bylaws-diff-container");
        if (!container || typeof BYLAWS_COMPILATION === "undefined") return;

        let articles = BYLAWS_COMPILATION.articles;
        const filter = this.bylawFilter;
        const search = this.bylawSearch;

        if (filter === "important") {
            articles = articles.filter(a => a.isImportant);
        } else if (filter === "new") {
            articles = articles.filter(a => a.changeType.includes("신설"));
        } else if (filter !== "all") {
            articles = articles.filter(a => a.chapter === filter);
        }

        if (search) {
            articles = articles.filter(a => 
                a.title.toLowerCase().includes(search) ||
                a.summary.toLowerCase().includes(search) ||
                a.current.toLowerCase().includes(search) ||
                a.revised.toLowerCase().includes(search) ||
                a.reason.toLowerCase().includes(search)
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
            this.updateIcons();
            return;
        }

        const isDiff = this.bylawViewMode === "diff";
        const isRevisedOnly = this.bylawViewMode === "revised";

        container.innerHTML = articles.map(art => `
            <div class="diff-card bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div class="flex items-center space-x-2.5">
                        <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                            ${escapeHtml(art.chapter)}
                        </span>
                        <h4 class="font-black text-slate-900 text-base sm:text-lg">
                            ${escapeHtml(art.title)}
                        </h4>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${art.badgeColor}">
                            ${escapeHtml(art.changeType)}
                        </span>
                    </div>
                    <div class="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        💡 핵심: ${escapeHtml(art.summary)}
                    </div>
                </div>

                ${isDiff ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="diff-box-current p-4 space-y-2">
                            <div class="flex items-center justify-between pb-1.5 border-b border-rose-200">
                                <span class="text-xs font-extrabold text-rose-800 flex items-center gap-1">
                                    <i data-lucide="minus-circle" class="w-3.5 h-3.5 text-rose-500"></i>
                                    종전 내용 (현행 조문)
                                </span>
                                <span class="text-[10px] text-rose-600 font-semibold">개정 전</span>
                            </div>
                            <div class="text-xs leading-relaxed text-slate-700 whitespace-pre-line font-normal">
                                ${escapeHtml(art.current)}
                            </div>
                        </div>

                        <div class="diff-box-revised p-4 space-y-2">
                            <div class="flex items-center justify-between pb-1.5 border-b border-blue-200">
                                <span class="text-xs font-extrabold text-blue-800 flex items-center gap-1">
                                    <i data-lucide="check-circle" class="w-3.5 h-3.5 text-blue-600"></i>
                                    변경 내용 (제6기 개정안)
                                </span>
                                <span class="text-[10px] text-blue-600 font-semibold">개정안</span>
                            </div>
                            <div class="text-xs leading-relaxed text-slate-900 whitespace-pre-line font-medium">
                                ${escapeHtml(art.revised)}
                            </div>
                        </div>
                    </div>
                ` : isRevisedOnly ? `
                    <div class="diff-box-revised p-5 space-y-2">
                        <span class="text-xs font-extrabold text-blue-800 block pb-1 border-b border-blue-200">
                            제6기 개정안 조문
                        </span>
                        <div class="text-xs leading-relaxed text-slate-900 whitespace-pre-line font-medium">
                            ${escapeHtml(art.revised)}
                        </div>
                    </div>
                ` : `
                    <div class="diff-box-current p-5 space-y-2">
                        <span class="text-xs font-extrabold text-rose-800 block pb-1 border-b border-rose-200">
                            종전 현행 조문
                        </span>
                        <div class="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                            ${escapeHtml(art.current)}
                        </div>
                    </div>
                `}

                <div class="pt-3 border-t border-slate-100">
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
                        <div class="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-[11px]">
                            <i data-lucide="info" class="w-3.5 h-3.5 text-indigo-600"></i>
                            <span>개정 사유 및 법령 근거 (검토 의견)</span>
                        </div>
                        <p class="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">
                            ${escapeHtml(art.reason)}
                        </p>
                    </div>
                </div>
            </div>
        `).join("");

        this.updateIcons();
    },

    handleFiles(fileList) {
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const newFile = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                uploadedAt: new Date().toLocaleDateString("ko-KR"),
                type: file.type || "문서 파일"
            };
            this.uploadedBylawsFiles.push(newFile);
        }
        this.saveFiles();
        this.renderUploadedFilesList();
        alert(`${fileList.length}개의 회칙 관련 파일이 안전하게 보관함에 등록되었습니다.`);
    },

    renderUploadedFilesList() {
        const listContainer = document.getElementById("bylaws-files-list");
        if (!listContainer) return;

        if (this.uploadedBylawsFiles.length === 0) {
            listContainer.innerHTML = `
                <div class="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
                    아직 등록된 공식 파일이 없습니다. 상단에서 파일을 드래그하여 업로드하세요.
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.uploadedBylawsFiles.map((f, idx) => `
            <div class="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm text-xs mb-2">
                <div class="flex items-center space-x-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-slate-800 truncate">${escapeHtml(f.name)}</p>
                        <p class="text-[11px] text-slate-400">${escapeHtml(f.size)} | 등록일: ${escapeHtml(f.uploadedAt)}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                    <button onclick="App.deleteBylawsFile(${idx})" class="p-1.5 text-slate-400 hover:text-red-500 rounded" title="파일 삭제">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join("");

        this.updateIcons();
    },

    deleteBylawsFile(index) {
        if (confirm("해당 회칙 파일을 삭제하시겠습니까?")) {
            this.uploadedBylawsFiles.splice(index, 1);
            this.saveFiles();
            this.renderUploadedFilesList();
        }
    },

    renderAll() {
        this.renderPadletBoard();
        this.renderMcpPolicyList();
        this.renderProposalSelector();
        this.renderUploadedFilesList();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});
