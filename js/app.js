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

    // Step 5: 정책 제안서 5선 렌더링 및 에디터 로드
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
                        <span class="text-xs text-slate-500 font-medium">${p.field}</span>
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

        document.getElementById("editor-title").value = p.title;
        document.getElementById("editor-field").value = p.field;
        document.getElementById("editor-target").value = p.targetAudience;
        document.getElementById("editor-budget").value = p.budget;
        document.getElementById("editor-mcp").value = p.mcpSource;
        document.getElementById("editor-background").value = p.proposalContent.background.join("\n\n");
        document.getElementById("editor-objectives").value = p.proposalContent.objectives.join("\n");
        document.getElementById("editor-details").value = p.proposalContent.details.join("\n\n");
        document.getElementById("editor-roadmap").value = p.proposalContent.roadmap.join("\n");
        document.getElementById("editor-expected").value = p.proposalContent.expectedEffects.join("\n");
    },

    copyProposalToClipboard() {
        const title = document.getElementById("editor-title").value;
        const field = document.getElementById("editor-field").value;
        const target = document.getElementById("editor-target").value;
        const budget = document.getElementById("editor-budget").value;
        const mcp = document.getElementById("editor-mcp").value;
        const background = document.getElementById("editor-background").value;
        const objectives = document.getElementById("editor-objectives").value;
        const details = document.getElementById("editor-details").value;
        const roadmap = document.getElementById("editor-roadmap").value;
        const expected = document.getElementById("editor-expected").value;

        const fullText = `[2027 화성시 청년정책제안서 - 동탄구 교육·참여·권리 분과]

■ 정책 제안명: ${title}
■ 정책 분과: ${field}
■ 사업 대상: ${target}
■ 소요 예산: ${budget}
■ 온통청년 MCP 연계: ${mcp}

1. 제안 배경 및 필요성
${background}

2. 사업 추진 목적
${objectives}

3. 세부 사업 내용
${details}

4. 연차별 추진 로드맵 (2027~2030)
${roadmap}

5. 기대 효과
${expected}
`;

        navigator.clipboard.writeText(fullText).then(() => {
            alert("정책제안서 전문이 클립보드에 복사되었습니다! 한글(HWP)이나 워드에 바로 붙여넣기 하실 수 있습니다.");
        }).catch(() => {
            alert("클립보드 복사에 실패했습니다. 텍스트를 직접 드래그하여 복사해주세요.");
        });
    },

    downloadProposalTxt() {
        const title = document.getElementById("editor-title").value;
        const fullText = `[2027 화성시 청년정책제안서 - 동탄구 교육·참여·권리 분과]
제안명: ${title}
분과: ${document.getElementById("editor-field").value}
사업대상: ${document.getElementById("editor-target").value}
예산: ${document.getElementById("editor-budget").value}
MCP연계: ${document.getElementById("editor-mcp").value}

[1. 제안 배경 및 필요성]
${document.getElementById("editor-background").value}

[2. 사업 추진 목적]
${document.getElementById("editor-objectives").value}

[3. 세부 사업 내용]
${document.getElementById("editor-details").value}

[4. 연차별 추진 로드맵]
${document.getElementById("editor-roadmap").value}

[5. 기대 효과]
${document.getElementById("editor-expected").value}
`;

        const blob = new Blob([fullText], { type: "text/plain;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/[\/\\:*?"<>|]/g, '_')}_정책제안서.txt`;
        link.click();
    },

    printProposal() {
        window.print();
    },

    // ==========================================
    // 4. 탭 3: 회칙 정리
    // ==========================================
    setupBylaws() {
        const bylawsContainer = document.getElementById("bylaws-articles-container");
        if (bylawsContainer) {
            bylawsContainer.innerHTML = DONGTAN_DATA.bylaws.articles.map((ch, idx) => `
                <div class="border border-slate-200 rounded-xl overflow-hidden bg-white mb-4 shadow-sm">
                    <button onclick="App.toggleBylawChapter(${idx})" class="w-full text-left px-5 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-800 text-sm transition">
                        <span>${ch.chapter}</span>
                        <i data-lucide="chevron-down" id="bylaw-arrow-${idx}" class="w-4 h-4 text-slate-400 transition-transform"></i>
                    </button>
                    <div id="bylaw-content-${idx}" class="px-5 py-4 space-y-3 text-xs leading-relaxed text-slate-700 border-t border-slate-200">
                        ${ch.items.map(item => `
                            <div>
                                <h5 class="font-bold text-slate-900 mb-1">${item.title}</h5>
                                <p class="text-slate-600 whitespace-pre-line pl-2 border-l-2 border-blue-400">${item.content}</p>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).join("");
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
