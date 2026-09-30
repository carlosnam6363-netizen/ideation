/**
 * 화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 메인 애플리케이션 로직
 */

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});

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

    init() {
        this.loadStorage();
        this.setupNavigation();
        this.setupPadlet();
        this.setupIdeation();
        this.setupBylaws();
        this.renderAll();
        lucide.createIcons();
    },

    // 로컬스토리지 불러오기 및 초기화
    loadStorage() {
        const savedPrograms = localStorage.getItem("dongtan_padlet_programs");
        if (savedPrograms) {
            try {
                this.programs = JSON.parse(savedPrograms);
            } catch (e) {
                this.programs = [...DONGTAN_DATA.initialPrograms];
            }
        } else {
            this.programs = [...DONGTAN_DATA.initialPrograms];
            this.savePrograms();
        }

        const savedFiles = localStorage.getItem("dongtan_bylaws_files");
        if (savedFiles) {
            try {
                this.uploadedBylawsFiles = JSON.parse(savedFiles);
            } catch (e) {
                this.uploadedBylawsFiles = [];
            }
        }
    },

    savePrograms() {
        localStorage.setItem("dongtan_padlet_programs", JSON.stringify(this.programs));
    },

    saveFiles() {
        localStorage.setItem("dongtan_bylaws_files", JSON.stringify(this.uploadedBylawsFiles));
    },

    // 1. 상단 내비게이션 탭 설정
    setupNavigation() {
        const tabBtns = document.querySelectorAll(".nav-tab-btn");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                this.switchTab(targetTab);
            });
        });
    },

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll(".nav-tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
        });

        document.querySelectorAll(".tab-content-panel").forEach(panel => {
            if (panel.id === tabId) {
                panel.classList.remove("hidden");
                panel.classList.add("fade-in-scale");
            } else {
                panel.classList.add("hidden");
                panel.classList.remove("fade-in-scale");
            }
        });

        if (tabId === "tab-2" && this.currentStep === 1) {
            setTimeout(() => this.renderSurveyChart(), 100);
        }
        lucide.createIcons();
    },

    // ==========================================
    // 2. 탭 1: 패들렛 (2027 교육 프로그램 취합)
    // ==========================================
    setupPadlet() {
        // 뷰 모드 토글 (컬럼별 vs 통합 그리드)
        const viewColsBtn = document.getElementById("view-columns-btn");
        const viewGridBtn = document.getElementById("view-grid-btn");
        if (viewColsBtn && viewGridBtn) {
            viewColsBtn.addEventListener("click", () => {
                this.padletViewMode = "columns";
                viewColsBtn.classList.add("bg-blue-600", "text-white");
                viewColsBtn.classList.remove("bg-white", "text-slate-700");
                viewGridBtn.classList.remove("bg-blue-600", "text-white");
                viewGridBtn.classList.add("bg-white", "text-slate-700");
                this.renderPadletBoard();
            });

            viewGridBtn.addEventListener("click", () => {
                this.padletViewMode = "grid";
                viewGridBtn.classList.add("bg-blue-600", "text-white");
                viewGridBtn.classList.remove("bg-white", "text-slate-700");
                viewColsBtn.classList.remove("bg-blue-600", "text-white");
                viewColsBtn.classList.add("bg-white", "text-slate-700");
                this.renderPadletBoard();
            });
        }

        // 카테고리 필터
        const filterBtns = document.querySelectorAll(".padlet-cat-filter");
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterBtns.forEach(b => b.classList.remove("bg-slate-900", "text-white"));
                filterBtns.forEach(b => b.classList.add("bg-white", "text-slate-600"));
                btn.classList.add("bg-slate-900", "text-white");
                btn.classList.remove("bg-white", "text-slate-600");
                this.filterCategory = btn.getAttribute("data-cat");
                this.renderPadletBoard();
            });
        });

        // 검색어 입력
        const searchInput = document.getElementById("padlet-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchKeyword = e.target.value.trim().toLowerCase();
                this.renderPadletBoard();
            });
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
        if (!select) return;
        select.innerHTML = DONGTAN_DATA.members.map(m => 
            `<option value="${m.id}">${m.name} (${m.role} - ${m.field})</option>`
        ).join("");
    },

    handleCreateProgram(form) {
        const memberId = parseInt(form.elements["memberId"].value, 10);
        const member = DONGTAN_DATA.members.find(m => m.id === memberId);
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
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        form.reset();

        alert("2027년 교육 프로그램 제안이 패들렛에 성공적으로 등록되었습니다!");
    },

    renderPadletBoard() {
        const container = document.getElementById("padlet-board-container");
        if (!container) return;

        // 필터링 적용
        let filtered = this.programs.filter(p => {
            const matchesCat = this.filterCategory === "all" || p.category === this.filterCategory;
            const matchesSearch = !this.searchKeyword || 
                p.title.toLowerCase().includes(this.searchKeyword) ||
                p.author.toLowerCase().includes(this.searchKeyword) ||
                p.purpose.toLowerCase().includes(this.searchKeyword) ||
                p.tags.some(t => t.toLowerCase().includes(this.searchKeyword));
            return matchesCat && matchesSearch;
        });

        // 1. 컬럼별 뷰 (12명 위원 컬럼)
        if (this.padletViewMode === "columns") {
            container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6 overflow-x-auto";
            
            container.innerHTML = DONGTAN_DATA.members.map(member => {
                const memberPrograms = filtered.filter(p => p.memberId === member.id);
                return `
                    <div class="padlet-column p-4 flex flex-col">
                        <!-- 위원 헤더 카드 -->
                        <div class="flex items-center space-x-3 mb-4 p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${member.color} text-white flex items-center justify-center font-bold text-sm shadow-inner">
                                ${member.name.slice(0, 2)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center space-x-2">
                                    <h4 class="font-bold text-slate-800 text-sm truncate">${member.name}</h4>
                                    <span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${member.role.includes('분과장') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                                        ${member.role}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-500 truncate" title="${member.field}">${member.field}</p>
                            </div>
                            <span class="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                                ${memberPrograms.length}건
                            </span>
                        </div>

                        <!-- 위원별 제안 카드 리스트 -->
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
        // 2. 통합 그리드 뷰 (인기순/최신순 카드 덱)
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

        lucide.createIcons();
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
            <div class="padlet-card p-4 flex flex-col justify-between" id="${prog.id}">
                <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <span class="text-[11px] px-2 py-0.5 font-bold rounded border ${catBadgeColors[prog.category] || 'bg-slate-100 text-slate-700'}">
                            ${prog.category}
                        </span>
                        <div class="flex items-center space-x-1">
                            <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusBadge[prog.status] || ''}">
                                ${prog.status}
                            </span>
                        </div>
                    </div>

                    <h4 class="font-bold text-slate-900 text-sm leading-snug mb-2 hover:text-blue-600 cursor-pointer">
                        ${prog.title}
                    </h4>

                    <p class="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                        ${prog.purpose}
                    </p>

                    <!-- 세부 메타 정보 -->
                    <div class="space-y-1 text-[11px] text-slate-500 mb-3">
                        <div class="flex items-center space-x-1">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span class="truncate">일정: ${prog.schedule}</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span class="truncate">방식: ${prog.format} | ${prog.target}</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <i data-lucide="building" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span class="truncate">추천기관: ${prog.institution}</span>
                        </div>
                    </div>

                    <!-- 태그 목록 -->
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${prog.tags.map(t => `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#${t}</span>`).join("")}
                    </div>
                </div>

                <!-- 푸터: 제안자 & 투표 & 댓글 -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium truncate max-w-[120px]">
                        ✍️ ${prog.author}
                    </span>
                    <div class="flex items-center space-x-2">
                        <button onclick="App.handleVote('${prog.id}')" class="flex items-center space-x-1 px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold transition">
                            <i data-lucide="heart" class="w-3.5 h-3.5 fill-rose-500"></i>
                            <span>${prog.likes}</span>
                        </button>
                        <button onclick="App.openCommentModal('${prog.id}')" class="flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                            <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                            <span>${prog.comments.length}</span>
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
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    },

    handleVote(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (prog) {
            prog.likes += 1;
            this.savePrograms();
            this.renderPadletBoard();
        }
    },

    openCommentModal(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        const commentListHtml = prog.comments.length === 0 ? 
            `<p class="text-xs text-slate-400 py-4 text-center">아직 등록된 의견이 없습니다. 첫 의견을 남겨보세요!</p>` :
            prog.comments.map(c => `
                <div class="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-200">
                    <span class="font-bold text-slate-800">${c.user}</span>
                    <p class="text-slate-600 mt-1">${c.text}</p>
                </div>
            `).join("");

        const newComment = prompt(`[${prog.title}]\n\n* 현재 등록된 의견 (${prog.comments.length}개):\n${prog.comments.map(c => `• ${c.user}: ${c.text}`).join("\n") || "없음"}\n\n새로운 의견이나 보완점을 작성해주세요:\n(예: 위원이름: 의견내용)`);
        
        if (newComment && newComment.trim()) {
            const parts = newComment.split(":");
            let author = "익명 위원";
            let text = newComment.trim();
            if (parts.length > 1) {
                author = parts[0].trim();
                text = parts.slice(1).join(":").trim();
            }
            prog.comments.push({ user: author, text: text });
            this.savePrograms();
            this.renderPadletBoard();
        }
    },

    exportProgramsToCSV() {
        const headers = ["번호", "제안자", "분야", "프로그램명", "교육방식", "교육대상", "예상일정", "추천기관", "추진목적", "상태", "추천수"];
        const rows = this.programs.map((p, idx) => [
            idx + 1,
            `"${p.author}"`,
            `"${p.category}"`,
            `"${p.title.replace(/"/g, '""')}"`,
            `"${p.format}"`,
            `"${p.target}"`,
            `"${p.schedule}"`,
            `"${p.institution}"`,
            `"${p.purpose.replace(/"/g, '""')}"`,
            `"${p.status}"`,
            p.likes
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `화성시_동탄구_2027교육프로그램취합목록_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
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

                this.selectedTrack = card.getAttribute("data-track");
                this.renderMcpPolicyList();
            });
        });

        // 온통청년 MCP 정책 검색 & 필터
        const mcpSearch = document.getElementById("mcp-search-input");
        if (mcpSearch) {
            mcpSearch.addEventListener("input", (e) => {
                this.mcpSearchKeyword = e.target.value.trim().toLowerCase();
                this.renderMcpPolicyList();
            });
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
                this.mcpCategoryFilter = btn.getAttribute("data-cat");
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

        // 스텝 패널 전환 및 애니메이션
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
            setTimeout(() => this.renderSurveyChart(), 100);
        } else if (stepNumber === 3) {
            this.renderMcpPolicyList();
        } else if (stepNumber === 5) {
            this.renderProposalSelector();
            this.loadProposal(this.selectedProposalIndex);
        }

        // 화면 상단으로 부드럽게 스크롤
        document.getElementById("tab-2")?.scrollIntoView({ behavior: "smooth" });
        lucide.createIcons();
    },

    // Step 1: 설문조사 차트 렌더링
    renderSurveyChart() {
        const canvas = document.getElementById("surveyChart");
        if (!canvas) return;

        if (window.mySurveyChart) {
            window.mySurveyChart.destroy();
        }

        const ctx = canvas.getContext("2d");
        window.mySurveyChart = new Chart(ctx, {
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

        let filtered = DONGTAN_DATA.ontongPolicies.filter(p => {
            const matchesCategory = this.mcpCategoryFilter === "all" || p.category.includes(this.mcpCategoryFilter);
            const matchesSearch = !this.mcpSearchKeyword || 
                p.title.toLowerCase().includes(this.mcpSearchKeyword) ||
                p.agency.toLowerCase().includes(this.mcpSearchKeyword) ||
                p.region.toLowerCase().includes(this.mcpSearchKeyword) ||
                p.content.toLowerCase().includes(this.mcpSearchKeyword);
            return matchesCategory && matchesSearch;
        });

        // 선택된 트랙과 연계도 우선순위 정렬
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
            return `
                <div class="bg-white p-5 rounded-xl border ${isTrackMatch ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 shadow-sm'} flex flex-col justify-between hover:shadow-md transition">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                ${p.category}
                            </span>
                            <span class="text-[11px] font-semibold px-2 py-0.5 rounded ${p.region.includes('화성') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                                ${p.region}
                            </span>
                        </div>

                        <div class="flex items-baseline space-x-1.5 mb-1.5">
                            <h4 class="font-bold text-slate-900 text-sm leading-snug hover:text-blue-600">
                                ${p.title}
                            </h4>
                        </div>

                        <p class="text-[11px] text-slate-500 mb-2">
                            주관: <span class="text-slate-700 font-medium">${p.agency}</span> | 대상: ${p.target}
                        </p>

                        <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg mb-3 border border-slate-100">
                            ${p.content}
                        </p>

                        <!-- MCP 연계 착안점 -->
                        <div class="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-900 mb-3">
                            <span class="font-bold flex items-center gap-1 text-[11px] text-blue-700 mb-0.5">
                                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-blue-600"></i>
                                우리 분과 MCP 연계 착안점
                            </span>
                            <p class="text-[11px] text-slate-700 leading-normal">${p.mcpMatch}</p>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-[10px] text-slate-400 font-mono">ID: ${p.id}</span>
                        ${p.url && !p.url.includes("URL 없음") ? `
                            <a href="${p.url}" target="_blank" class="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-xs">
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

        lucide.createIcons();
    },

    // Step 3: 세부 정책 목록 열기/닫기 토글
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

    // Step 5: 정책 제안서 5선 렌더링 및 서식 로드
    renderProposalSelector() {
        const listContainer = document.getElementById("proposal-cards-list");
        if (!listContainer) return;

        listContainer.innerHTML = DONGTAN_DATA.recommendedPolicies.map((p, idx) => {
            const isSelected = idx === this.selectedProposalIndex;
            return `
                <div onclick="App.loadProposal(${idx})" class="cursor-pointer p-4 rounded-xl border transition-all ${isSelected ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300 shadow-sm'}">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            추천 제안 ${p.num}
                        </span>
                        <span class="text-xs text-slate-500 font-medium truncate max-w-[140px]">${p.field}</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">${p.title}</h4>
                    <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">${p.summary}</p>
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

    // 한글(HWP) 파일로 추출 및 다운로드
    exportToHWP() {
        const data = this.getProposalFormData();
        const safeTitle = data.title.replace(/[\/\\:*?"<>|]/g, "_");

        const hwpHTML = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${data.title}</title>
<style>
  body { font-family: '맑은 고딕', 'Malgun Gothic', '한컴바탕', Batang, sans-serif; font-size: 11pt; line-height: 1.6; }
  h1 { text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 25px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1pt solid #000000; padding: 8pt 10pt; font-size: 11pt; vertical-align: middle; }
  th { background-color: #F1F5F9; font-weight: bold; text-align: center; width: 130px; }
  .section-hdr { background-color: #F8FAFC; font-weight: bold; text-align: center; vertical-align: middle; }
  .sub-hdr { font-weight: bold; color: #1E3A8A; margin-bottom: 4pt; }
  .content-text { white-space: pre-wrap; font-size: 10.5pt; color: #1E293B; }
  .footer { text-align: right; margin-top: 25px; font-size: 11pt; font-weight: bold; }
</style>
</head>
<body>
  <h1>화성시 청년정책협의체 정책 제안서</h1>
  <table>
    <tr>
      <th>분 과 명</th>
      <td colspan="2"><div class="content-text">${data.division}</div></td>
    </tr>
    <tr>
      <th>제 안 명</th>
      <td colspan="2"><div class="content-text" style="font-weight: bold; font-size: 13pt; color: #1E40AF;">${data.title}</div></td>
    </tr>
    <tr>
      <th>추진근거</th>
      <td colspan="2"><div class="content-text">${data.basis}</div></td>
    </tr>
    <tr>
      <th>참고정책</th>
      <td colspan="2"><div class="content-text">${data.refPolicy}</div></td>
    </tr>
    <tr>
      <th rowspan="2">제안배경<br>및<br>필요성</th>
      <th style="width: 120px; background-color: #FFF1F2; color: #9F1239;">현황과 문제점</th>
      <td><div class="content-text">${data.problems}</div></td>
    </tr>
    <tr>
      <th style="width: 120px; background-color: #EFF6FF; color: #1E40AF;">개선방안</th>
      <td><div class="content-text">${data.solutions}</div></td>
    </tr>
    <tr>
      <th>제안내용</th>
      <td colspan="2"><div class="content-text">${data.details}</div></td>
    </tr>
    <tr>
      <th>기대효과</th>
      <td colspan="2"><div class="content-text">${data.effects}</div></td>
    </tr>
  </table>
  <div class="footer">
    화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동
  </div>
</body>
</html>`;

        const blob = new Blob(["\ufeff" + hwpHTML], { type: "application/x-hwp;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeTitle}.hwp`;
        link.click();
        alert(`한글(HWP) 파일이 성공적으로 다운로드되었습니다!\n한컴오피스 한글에서 완벽한 표 서식으로 열립니다.`);
    },

    // 워드(DOCX) 파일로 추출 및 다운로드
    exportToDOCX() {
        const data = this.getProposalFormData();
        const safeTitle = data.title.replace(/[\/\\:*?"<>|]/g, "_");

        const docxHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${data.title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 21.0cm 29.7cm; margin: 2.5cm 2.0cm 2.0cm 2.0cm; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
  h1 { text-align: center; font-size: 21pt; font-weight: bold; margin-bottom: 25pt; letter-spacing: -0.5pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 15pt; }
  th, td { border: 1.5pt solid #000000; padding: 10pt; font-size: 11pt; vertical-align: middle; }
  th { background-color: #F1F5F9; font-weight: bold; text-align: center; width: 130px; }
  .content-box { white-space: pre-wrap; font-size: 10.5pt; }
  .footer { text-align: right; margin-top: 30pt; font-size: 12pt; font-weight: bold; }
</style>
</head>
<body>
  <h1>화성시 청년정책협의체 정책 제안서</h1>
  <table>
    <tr>
      <th>분 과 명</th>
      <td colspan="2"><div class="content-box">${data.division}</div></td>
    </tr>
    <tr>
      <th>제 안 명</th>
      <td colspan="2"><div class="content-box" style="font-weight: bold; font-size: 13pt; color: #1E40AF;">${data.title}</div></td>
    </tr>
    <tr>
      <th>추진근거</th>
      <td colspan="2"><div class="content-box">${data.basis}</div></td>
    </tr>
    <tr>
      <th>참고정책</th>
      <td colspan="2"><div class="content-box">${data.refPolicy}</div></td>
    </tr>
    <tr>
      <th rowspan="2">제안배경<br>및<br>필요성</th>
      <th style="width: 120px; background-color: #FFF1F2; color: #9F1239;">현황과 문제점</th>
      <td><div class="content-box">${data.problems}</div></td>
    </tr>
    <tr>
      <th style="width: 120px; background-color: #EFF6FF; color: #1E40AF;">개선방안</th>
      <td><div class="content-box">${data.solutions}</div></td>
    </tr>
    <tr>
      <th>제안내용</th>
      <td colspan="2"><div class="content-box">${data.details}</div></td>
    </tr>
    <tr>
      <th>기대효과</th>
      <td colspan="2"><div class="content-box">${data.effects}</div></td>
    </tr>
  </table>
  <div class="footer">
    화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동
  </div>
</body>
</html>`;

        const blob = new Blob(["\ufeff" + docxHTML], { type: "application/msword;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeTitle}.doc`;
        link.click();
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

    downloadProposalTxt() {
        const data = this.getProposalFormData();
        const safeTitle = data.title.replace(/[\/\\:*?"<>|]/g, "_");
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
        const blob = new Blob(["\ufeff" + text], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeTitle}.txt`;
        link.click();
    },

    printProposal() {
        window.print();
    },

        // ==========================================
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

    toggleBylawChapter(idx) {
        const content = document.getElementById(`bylaw-content-${idx}`);
        const arrow = document.getElementById(`bylaw-arrow-${idx}`);
        if (!content) return;
        const isHidden = content.classList.contains("hidden");
        if (isHidden) {
            content.classList.remove("hidden");
            if (arrow) arrow.style.transform = "rotate(0deg)";
        } else {
            content.classList.add("hidden");
            if (arrow) arrow.style.transform = "rotate(-90deg)";
        }
    },

    handleFiles(fileList) {
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const newFile = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                uploadedAt: new Date().toLocaleString("ko-KR"),
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
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-slate-800 truncate">${f.name}</p>
                        <p class="text-[11px] text-slate-400">${f.size} | 등록일: ${f.uploadedAt}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="App.deleteBylawsFile(${idx})" class="p-1.5 text-slate-400 hover:text-red-500 rounded">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join("");

        lucide.createIcons();
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
