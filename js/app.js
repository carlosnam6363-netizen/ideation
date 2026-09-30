/**
 * 화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 메인 애플리케이션 로직
 * (성능 최적화, 디바운스 검색, XSS 방지, 협의체 전체 플로우 및 운영위원 관리 탑재)
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

    // 4번 탭 (협의체 전체 플로우) 상태
    flowYear: 2026, // "all", 2026, 2027
    flowQuarter: "all", // "all", "Q1", "Q2", "Q3", "Q4"
    flowSearch: "",
    flowCheckedTasks: {},

    // 5번 탭 (위원 명단 관리: 운영위 & 분과위원) 상태
    steeringMembers: [],
    divisionMembers: [],   // 분과 위원 명단
    tab5Sub: "division",   // 5번 탭의 활성 서브 탭 (기본값: 첨부 이미지와 같은 "division")

    // 관리자 권한 상태 (비밀번호: 2232)
    isAdmin: sessionStorage.getItem("dongtan_admin_auth") === "true",

    init() {
        this.loadStorage();
        this.setupNavigation();
        this.setupPadlet();
        this.setupIdeation();
        this.setupBylaws();
        this.setupCouncilFlow();
        this.renderAll();
        this.updateAdminUI();
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
            // 동탄구 교육·참여·권리 분과장 김남현으로 자동 동기화
            this.programs.forEach(p => {
                if (p.memberId === 1 && (p.author || '').includes("강현우")) {
                    p.author = "김남현 (분과장)";
                }
            });
        } catch {
            this.programs = [...DONGTAN_DATA.initialPrograms];
        }

        try {
            const savedFiles = localStorage.getItem("dongtan_bylaws_files");
            this.uploadedBylawsFiles = savedFiles ? JSON.parse(savedFiles) : [];
        } catch {
            this.uploadedBylawsFiles = [];
        }

        // 운영위원회 명단 불러오기 (공식 명단 자동 마이그레이션, 배수경 제외, 회칙 기준 직무만 반영 및 전화번호/이메일 공란 처리)
        try {
            const savedSteering = localStorage.getItem("dongtan_steering_members");
            if (savedSteering && typeof COUNCIL_FLOW_DATA !== "undefined") {
                const parsed = JSON.parse(savedSteering);
                // 이전 10인 체계이거나 윤재원 회장 기준이 아닌 경우 공식 명단으로 자동 마이그레이션
                if (!Array.isArray(parsed) || parsed.length < 14 || parsed[0].name !== "윤재원") {
                    this.steeringMembers = JSON.parse(JSON.stringify(COUNCIL_FLOW_DATA.initialSteeringMembers));
                } else {
                    this.steeringMembers = parsed;
                }
            } else if (typeof COUNCIL_FLOW_DATA !== "undefined") {
                this.steeringMembers = JSON.parse(JSON.stringify(COUNCIL_FLOW_DATA.initialSteeringMembers));
            }
            // 사용자 요청: 배수경 분과장 제외, 회칙에 기록된 직무만 반영(그 외 공란), 연락처/이메일 공란 처리
            if (this.steeringMembers && this.steeringMembers.length && typeof COUNCIL_FLOW_DATA !== "undefined") {
                this.steeringMembers = this.steeringMembers.filter(m => m.name !== "배수경" && !(m.role && m.role.includes("배수경")));
                const initMap = {};
                COUNCIL_FLOW_DATA.initialSteeringMembers.forEach(im => {
                    initMap[im.id] = im.duties || "";
                });
                this.steeringMembers.forEach(m => {
                    if (initMap[m.id] !== undefined) {
                        m.duties = initMap[m.id];
                    } else if (m.role && !m.role.includes("회장") && !m.role.includes("사무국장") && !m.role.includes("구위원장")) {
                        m.duties = "";
                    }
                    m.phone = "";
                    m.email = "";
                });
                this.saveSteeringMembers();
            }
        } catch {
            if (typeof COUNCIL_FLOW_DATA !== "undefined") {
                this.steeringMembers = JSON.parse(JSON.stringify(COUNCIL_FLOW_DATA.initialSteeringMembers));
                this.steeringMembers = this.steeringMembers.filter(m => m.name !== "배수경");
                this.steeringMembers.forEach(m => {
                    m.phone = "";
                    m.email = "";
                });
            }
        }

        // 월별 체크리스트 완료 상태 불러오기
        try {
            const savedChecks = localStorage.getItem("dongtan_flow_checked_tasks");
            this.flowCheckedTasks = savedChecks ? JSON.parse(savedChecks) : {};
        } catch {
            this.flowCheckedTasks = {};
        }

        // 분과 위원 명단 불러오기 (엑셀 원본 연락처 데이터 동기화)
        try {
            const savedDivision = localStorage.getItem("dongtan_division_members");
            if (savedDivision && typeof DIVISION_MEMBERS_INITIAL !== "undefined") {
                const parsed = JSON.parse(savedDivision);
                this.divisionMembers = Array.isArray(parsed) && parsed.length > 0 ? parsed : JSON.parse(JSON.stringify(DIVISION_MEMBERS_INITIAL));
                // 초기 엑셀 데이터의 전화번호가 비어있는 경우 복원
                const phoneMap = {};
                DIVISION_MEMBERS_INITIAL.forEach(dm => {
                    phoneMap[dm.id] = dm.phone;
                    phoneMap[dm.name] = dm.phone;
                });
                this.divisionMembers.forEach(m => {
                    if (!m.phone && (phoneMap[m.id] || phoneMap[m.name])) {
                        m.phone = phoneMap[m.id] || phoneMap[m.name];
                    }
                });
                this.saveDivisionMembers();
            } else if (typeof DIVISION_MEMBERS_INITIAL !== "undefined") {
                this.divisionMembers = JSON.parse(JSON.stringify(DIVISION_MEMBERS_INITIAL));
                this.saveDivisionMembers();
            }
        } catch {
            if (typeof DIVISION_MEMBERS_INITIAL !== "undefined") {
                this.divisionMembers = JSON.parse(JSON.stringify(DIVISION_MEMBERS_INITIAL));
            }
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

    saveSteeringMembers() {
        try {
            localStorage.setItem("dongtan_steering_members", JSON.stringify(this.steeringMembers));
        } catch (e) {
            console.warn("운영위원회 명단 저장 실패:", e);
        }
    },

    saveDivisionMembers() {
        try {
            localStorage.setItem("dongtan_division_members", JSON.stringify(this.divisionMembers));
        } catch (e) {
            console.warn("분과 위원 명단 저장 실패:", e);
        }
    },

    saveFlowCheckedTasks() {
        try {
            localStorage.setItem("dongtan_flow_checked_tasks", JSON.stringify(this.flowCheckedTasks));
        } catch (e) {
            console.warn("체크리스트 상태 저장 실패:", e);
        }
    },

    // 1. 사이드바 내비게이션 탭 설정 (PC 및 모바일 반응형 완벽 대응)
    setupNavigation() {
        const tabBtns = document.querySelectorAll(".nav-tab-btn");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                if (targetTab) {
                    this.switchTab(targetTab);
                    // 모바일 화면에서는 탭 선택 후 사이드바 메뉴 자동 닫기
                    if (window.innerWidth < 1024) {
                        const wrapper = document.getElementById("sidebar-collapsible-wrapper");
                        if (wrapper) wrapper.classList.add("hidden");
                    }
                }
            });
        });

        // 사이드바 내부 모바일 토글 버튼
        const mobileToggleBtn = document.getElementById("mobile-sidebar-toggle-btn");
        const collapsibleWrapper = document.getElementById("sidebar-collapsible-wrapper");
        if (mobileToggleBtn && collapsibleWrapper) {
            mobileToggleBtn.addEventListener("click", () => {
                collapsibleWrapper.classList.toggle("hidden");
                this.updateIcons();
            });
        }

        // 상단 헤더의 모바일 햄버거 메뉴 버튼
        const headerMobileBtn = document.getElementById("header-mobile-menu-btn");
        if (headerMobileBtn && collapsibleWrapper) {
            headerMobileBtn.addEventListener("click", () => {
                collapsibleWrapper.classList.toggle("hidden");
                if (!collapsibleWrapper.classList.contains("hidden")) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                this.updateIcons();
            });
        }

        // 모바일/PC 공통 모달 배경 클릭 및 ESC 키 닫기 지원
        const modalBackdrops = [
            { id: "program-modal", close: () => this.closeProgramModal() },
            { id: "steering-member-modal", close: () => this.closeSteeringModal() },
            { id: "division-member-modal", close: () => this.closeDivisionModal() },
            { id: "admin-auth-modal", close: () => this.closeAdminModal() }
        ];

        modalBackdrops.forEach(({ id, close }) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("click", (e) => {
                    if (e.target === el) close();
                });
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeProgramModal();
                this.closeSteeringModal();
                this.closeDivisionModal();
                this.closeAdminModal();
            }
        });
    },

    closeProgramModal() {
        const modal = document.getElementById("program-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    switchTab(tabId) {
        if (this.currentTab === tabId) return;
        this.currentTab = tabId;

        document.querySelectorAll(".nav-tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
        });

        // 상단 바 활성 탭 이름 갱신
        const tabTitles = {
            "tab-1": "1. 2027년 교육 프로그램 취합 (패들렛 보드)",
            "tab-2": "2. 2027년 정책제안서 작성 아이디에이션 (5단계 워크플로우)",
            "tab-3": "3. 회칙 정리 (신·구 조문 대비표 & 파일 보관함)",
            "tab-4": "4. 협의체 전체 플로우 (2026~2027 연간 로드맵)",
            "tab-5": "5. 위원 명단 관리 (운영위원회 & 분과위원)"
        };
        const titleEl = document.getElementById("header-active-tab-title");
        if (titleEl && tabTitles[tabId]) {
            titleEl.textContent = tabTitles[tabId];
        }

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
        } else if (tabId === "tab-4") {
            this.renderCouncilFlow();
        } else if (tabId === "tab-5") {
            this.switchTab5Sub(this.tab5Sub || "division");
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

        const searchInput = document.getElementById("padlet-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", debounce((e) => {
                this.searchKeyword = e.target.value.trim().toLowerCase();
                this.renderPadletBoard();
            }, 120));
        }

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
        } else {
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

        const animClass = stepNumber > prevStep ? "step-anim-next" : "step-anim-prev";
        for (let i = 1; i <= 5; i++) {
            const panel = document.getElementById(`ideation-step-${i}`);
            if (panel) {
                if (i === stepNumber) {
                    panel.classList.remove("hidden");
                    panel.classList.remove("step-anim-next", "step-anim-prev");
                    void panel.offsetWidth;
                    panel.classList.add(animClass);
                } else {
                    panel.classList.add("hidden");
                }
            }
        }

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

    // ==========================================
    // 5. 탭 4: 협의체 전체 플로우 & 운영위원 명단 관리
    // ==========================================
    setupCouncilFlow() {
        const searchInput = document.getElementById("flow-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", debounce((e) => {
                this.flowSearch = e.target.value.trim().toLowerCase();
                this.renderCouncilFlow();
            }, 120));
        }
    },

    // 운영위원회 명단 그리드 렌더링 (이름 실시간 수정 가능)
    // 운영위원회 구별 필터링
    filterSteeringDistrict(district, btn) {
        this.steeringDistrictFilter = district;
        const chips = document.querySelectorAll(".steering-district-chip");
        chips.forEach(chip => {
            chip.classList.remove("bg-blue-600", "text-white", "font-bold");
            chip.classList.add("bg-white", "text-slate-600", "font-semibold");
        });
        if (btn) {
            btn.classList.add("bg-blue-600", "text-white", "font-bold");
            btn.classList.remove("bg-white", "text-slate-600", "font-semibold");
        }
        this.renderSteeringMembersGrid();
    },

    // 운영위원회 명단 그리드 렌더링 (16인 지원 & 실시간 인풋 동기화)
    // 운영위원회 명단 그리드 렌더링 (수정/삭제 단추 지원 & 실시간 인풋 동기화)
    renderSteeringMembersGrid() {
        const grid = document.getElementById("steering-members-grid");
        if (!grid || !this.steeringMembers.length) return;

        const filter = this.steeringDistrictFilter || "all";
        const filteredList = filter === "all" 
            ? this.steeringMembers 
            : this.steeringMembers.filter(m => m.district.includes(filter));

        const districtColors = {
            "동탄구": "bg-blue-600 text-white",
            "만세구": "bg-emerald-600 text-white",
            "병점구": "bg-sky-600 text-white",
            "효행구": "bg-cyan-700 text-white"
        };

        grid.innerHTML = filteredList.map(m => `
            <div class="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-xs flex flex-col justify-between" id="card-${escapeHtml(m.id)}">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-1.5 flex-1 min-w-0 mr-1">
                            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${districtColors[m.district] || 'bg-slate-700 text-white'}">
                                ${escapeHtml(m.district)}
                            </span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border truncate ${m.badgeColor}" title="${escapeHtml(m.role)}">
                                ${escapeHtml(m.role)}
                            </span>
                        </div>
                        <!-- 수정 및 삭제 기능 단추 -->
                        <div class="flex items-center space-x-1 shrink-0">
                            <button 
                                type="button" 
                                onclick="App.openEditSteeringModal('${escapeHtml(m.id)}')" 
                                title="위원 정보 상세 수정"
                                class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            >
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button 
                                type="button" 
                                onclick="App.deleteSteeringMember('${escapeHtml(m.id)}')" 
                                title="명단에서 제외/삭제"
                                class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 실명 입력 필드 -->
                    <div class="mt-1 mb-2">
                        <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">성명 (클릭하여 수정 가능)</label>
                        <div class="relative">
                            <input 
                                id="sm-name-${escapeHtml(m.id)}" 
                                type="text" 
                                value="${escapeHtml(m.name)}" 
                                oninput="App.handleSteeringMemberInput('${escapeHtml(m.id)}', 'name', this.value)"
                                class="w-full text-xs font-black text-slate-900 bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 transition"
                                placeholder="이름 입력"
                            >
                        </div>
                    </div>

                    ${m.duties ? `
                        <div class="bg-slate-100/80 p-2 rounded-lg border border-slate-200/60 mb-2">
                            <p class="text-[10px] font-bold text-slate-700 flex items-center gap-1 mb-0.5">
                                <i data-lucide="scroll-text" class="w-3 h-3 text-blue-600 shrink-0"></i>
                                <span>회칙상 직무</span>
                            </p>
                            <p class="text-[11px] text-slate-600 line-clamp-3 leading-relaxed" title="${escapeHtml(m.duties)}">
                                ${escapeHtml(m.duties)}
                            </p>
                        </div>
                    ` : `
                        <div class="py-2.5 px-2 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 mb-2 text-center">
                            <span class="text-[10px] text-slate-400 italic">회칙상 별도 고유활동 규정 없음 (공란)</span>
                        </div>
                    `}
                </div>

                <div class="pt-2 border-t border-slate-200/80 space-y-1">
                    <input 
                        id="sm-phone-${escapeHtml(m.id)}" 
                        type="text" 
                        value="${escapeHtml(m.phone || '')}" 
                        oninput="App.handleSteeringMemberInput('${escapeHtml(m.id)}', 'phone', this.value)"
                        class="w-full text-[10px] text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5"
                        placeholder="연락처 (선택)"
                    >
                    <input 
                        id="sm-email-${escapeHtml(m.id)}" 
                        type="text" 
                        value="${escapeHtml(m.email || '')}" 
                        oninput="App.handleSteeringMemberInput('${escapeHtml(m.id)}', 'email', this.value)"
                        class="w-full text-[10px] text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5"
                        placeholder="이메일 (선택)"
                    >
                </div>
            </div>
        `).join("");

        this.updateSteeringCounts();
        this.updateIcons();
    },

    // 인풋 실시간 반영
    handleSteeringMemberInput(memberId, field, value) {
        const member = this.steeringMembers.find(m => m.id === memberId);
        if (member) {
            member[field] = value.trim();
            this.saveSteeringMembers();
            if (field === 'name') {
                this.renderCouncilFlow();
            }
        }
    },

    // 운영위원 삭제 기능 단추
    deleteSteeringMember(memberId) {
        const member = this.steeringMembers.find(m => m.id === memberId);
        if (!member) return;
        if (confirm(`'${member.name}' (${member.district} · ${member.role}) 위원을 운영위원회 명단에서 삭제하시겠습니까?`)) {
            this.steeringMembers = this.steeringMembers.filter(m => m.id !== memberId);
            this.saveSteeringMembers();
            this.renderSteeringMembersGrid();
            this.renderCouncilFlow();
            this.updateSteeringCounts();
        }
    },

    // 운영위원 수정 모달 열기
    openEditSteeringModal(memberId) {
        const member = this.steeringMembers.find(m => m.id === memberId);
        if (!member) return;

        const title = document.getElementById("steering-modal-title");
        if (title) title.textContent = "운영위원 정보 수정";

        const idInput = document.getElementById("modal-sm-id");
        const distInput = document.getElementById("modal-sm-district");
        const roleInput = document.getElementById("modal-sm-role");
        const nameInput = document.getElementById("modal-sm-name");
        const dutiesInput = document.getElementById("modal-sm-duties");
        const phoneInput = document.getElementById("modal-sm-phone");
        const emailInput = document.getElementById("modal-sm-email");

        if (idInput) idInput.value = member.id;
        if (distInput) distInput.value = member.district || "동탄구";
        if (roleInput) roleInput.value = member.role || "";
        if (nameInput) nameInput.value = member.name || "";
        if (dutiesInput) dutiesInput.value = member.duties || "";
        if (phoneInput) phoneInput.value = member.phone || "";
        if (emailInput) emailInput.value = member.email || "";

        const modal = document.getElementById("steering-member-modal");
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }
        this.updateIcons();
    },

    // 신규 운영위원 추가 모달 열기
    openAddSteeringModal() {
        const title = document.getElementById("steering-modal-title");
        if (title) title.textContent = "신규 운영위원 추가";

        const idInput = document.getElementById("modal-sm-id");
        const distInput = document.getElementById("modal-sm-district");
        const roleInput = document.getElementById("modal-sm-role");
        const nameInput = document.getElementById("modal-sm-name");
        const dutiesInput = document.getElementById("modal-sm-duties");
        const phoneInput = document.getElementById("modal-sm-phone");
        const emailInput = document.getElementById("modal-sm-email");

        if (idInput) idInput.value = "";
        if (distInput) distInput.value = "동탄구";
        if (roleInput) roleInput.value = "";
        if (nameInput) nameInput.value = "";
        if (dutiesInput) dutiesInput.value = "";
        if (phoneInput) phoneInput.value = "";
        if (emailInput) emailInput.value = "";

        const modal = document.getElementById("steering-member-modal");
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }
        this.updateIcons();
    },

    // 모달 닫기
    closeSteeringModal() {
        const modal = document.getElementById("steering-member-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    // 모달 폼 저장 (신규 등록 또는 기존 수정)
    saveSteeringMemberFromModal(e) {
        if (e) e.preventDefault();

        const id = document.getElementById("modal-sm-id").value;
        const district = document.getElementById("modal-sm-district").value;
        const role = document.getElementById("modal-sm-role").value.trim();
        const name = document.getElementById("modal-sm-name").value.trim();
        const duties = document.getElementById("modal-sm-duties").value.trim();
        const phone = document.getElementById("modal-sm-phone").value.trim();
        const email = document.getElementById("modal-sm-email").value.trim();

        if (!name || !role) {
            alert("성명과 직책은 필수 입력 항목입니다.");
            return;
        }

        const badgeColorMap = {
            "동탄구": "bg-blue-50 text-blue-700 border-blue-200",
            "만세구": "bg-emerald-50 text-emerald-700 border-emerald-200",
            "병점구": "bg-sky-50 text-sky-700 border-sky-200",
            "효행구": "bg-cyan-50 text-cyan-700 border-cyan-200"
        };

        if (id) {
            // 기존 위원 정보 수정
            const member = this.steeringMembers.find(m => m.id === id);
            if (member) {
                member.district = district;
                member.role = role;
                member.name = name;
                member.duties = duties;
                member.phone = phone;
                member.email = email;
            }
        } else {
            // 신규 위원 추가
            const newMember = {
                id: "sm-" + Date.now(),
                district: district,
                name: name,
                role: role,
                subrole: district + " 운영위원",
                roleKey: "member_" + Date.now(),
                phone: phone,
                email: email,
                duties: duties || "",
                badgeColor: badgeColorMap[district] || "bg-slate-100 text-slate-700 border-slate-200"
            };
            this.steeringMembers.push(newMember);
        }

        this.saveSteeringMembers();
        this.closeSteeringModal();
        this.renderSteeringMembersGrid();
        this.renderCouncilFlow();
        this.updateSteeringCounts();

        alert(id ? "위원 정보가 성공적으로 수정되었습니다." : "신규 위원이 운영위원회 명단에 추가되었습니다.");
    },

    // 인원수 UI 카운트 갱신
    updateSteeringCounts() {
        const total = this.steeringMembers.length;
        const dongtan = this.steeringMembers.filter(m => m.district.includes("동탄구")).length;
        const manse = this.steeringMembers.filter(m => m.district.includes("만세구")).length;
        const byeongjeom = this.steeringMembers.filter(m => m.district.includes("병점구")).length;
        const hyoheng = this.steeringMembers.filter(m => m.district.includes("효행구")).length;

        const totalSpan = document.getElementById("steering-total-count");
        if (totalSpan) totalSpan.textContent = total;

        const countHeader = document.getElementById("steering-header-count");
        if (countHeader) countHeader.textContent = `(총 ${total}인)`;

        const btnAll = document.getElementById("steering-chip-all");
        if (btnAll) btnAll.textContent = `전체 (${total}명)`;
        const btnDongtan = document.getElementById("steering-chip-dongtan");
        if (btnDongtan) btnDongtan.textContent = `동탄구 (${dongtan}명)`;
        const btnManse = document.getElementById("steering-chip-manse");
        if (btnManse) btnManse.textContent = `만세구 (${manse}명)`;
        const btnByeongjeom = document.getElementById("steering-chip-byeongjeom");
        if (btnByeongjeom) btnByeongjeom.textContent = `병점구 (${byeongjeom}명)`;
        const btnHyoheng = document.getElementById("steering-chip-hyoheng");
        if (btnHyoheng) btnHyoheng.textContent = `효행구 (${hyoheng}명)`;

        const tab5SteeringBadge = document.getElementById("tab5-steering-badge");
        if (tab5SteeringBadge) tab5SteeringBadge.textContent = total;

        const totalDiv = this.divisionMembers ? this.divisionMembers.length : 0;
        const navMembersBadge = document.getElementById("nav-members-count-badge");
        if (navMembersBadge) navMembersBadge.textContent = `총 ${total + totalDiv}인`;
    },

    // 사용자가 수정한 운영위원 명단 일괄 저장
    saveSteeringMembersFromUI() {
        this.steeringMembers.forEach(m => {
            const nameInput = document.getElementById(`sm-name-${m.id}`);
            const phoneInput = document.getElementById(`sm-phone-${m.id}`);
            const emailInput = document.getElementById(`sm-email-${m.id}`);

            if (nameInput) m.name = nameInput.value.trim() || m.name;
            if (phoneInput) m.phone = phoneInput.value.trim();
            if (emailInput) m.email = emailInput.value.trim();
        });

        this.saveSteeringMembers();
        this.renderSteeringMembersGrid();
        this.renderCouncilFlow();

        alert("운영위원회 위원 명단이 성공적으로 저장되었습니다!\n아래 월별 추진 플로우의 [담당 운영위원] 항목에 실시간 반영되었습니다.");
    },

    // 기본 운영위원 명단으로 초기화
    resetSteeringMembers() {
        if (confirm("공식 임원 이력 기준 운영위원회 명단으로 복원하시겠습니까?")) {
            this.steeringMembers = JSON.parse(JSON.stringify(COUNCIL_FLOW_DATA.initialSteeringMembers));
            this.saveSteeringMembers();
            this.renderSteeringMembersGrid();
            this.renderCouncilFlow();
            this.updateSteeringCounts();
        }
    },

    // 특정 직책 key에 매핑된 운영위원 실명 찾기
    getSteeringMember(roleKey) {
        if (!this.steeringMembers || !this.steeringMembers.length) return null;
        if (roleKey === "dongtanLeader") {
            return this.steeringMembers.find(m => m.roleKey === "dongtanLeader" || m.roleKey === "president") || null;
        }
        if (roleKey === "byeongjeomLeader") {
            return this.steeringMembers.find(m => m.roleKey === "byeongjeomLeader" || m.roleKey === "vicePresident") || null;
        }
        if (roleKey === "prLeader") {
            return this.steeringMembers.find(m => m.roleKey === "secretary1" || m.roleKey === "secretary2") || this.steeringMembers[0];
        }
        return this.steeringMembers.find(m => m.roleKey === roleKey) || null;
    },

    // 연도 선택 전환 (all, 2026, 2027)
    setFlowYear(year) {
        this.flowYear = year;

        const allBtn = document.getElementById("flow-year-all-btn");
        const btn2026 = document.getElementById("flow-year-2026-btn");
        const btn2027 = document.getElementById("flow-year-2027-btn");

        const defaultClass = "px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1.5";
        const activeClass = "px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 text-white transition flex items-center space-x-1.5 shadow-sm";

        if (allBtn) allBtn.className = year === "all" ? activeClass : defaultClass;
        if (btn2026) btn2026.className = year === 2026 ? activeClass : defaultClass;
        if (btn2027) btn2027.className = year === 2027 ? activeClass : defaultClass;

        this.renderCouncilFlow();
    },

    // 분기 필터링 (all, Q1, Q2, Q3, Q4)
    filterFlowQuarter(quarter, element) {
        this.flowQuarter = quarter;
        const chips = document.querySelectorAll(".flow-quarter-chip");
        chips.forEach(chip => {
            chip.classList.remove("bg-slate-900", "text-white");
            chip.classList.add("bg-white", "text-slate-600");
        });

        if (element) {
            element.classList.add("bg-slate-900", "text-white");
            element.classList.remove("bg-white", "text-slate-600");
        }

        this.renderCouncilFlow();
    },

    // 월별 할 일 체크박스 토글
    toggleFlowTask(taskId) {
        this.flowCheckedTasks[taskId] = !this.flowCheckedTasks[taskId];
        this.saveFlowCheckedTasks();
        this.renderCouncilFlow();
    },

    // 전체 협의체 2개년 월별 플로우 렌더링
    renderCouncilFlow() {
        const container = document.getElementById("flow-timeline-container");
        if (!container || typeof COUNCIL_FLOW_DATA === "undefined") return;

        const show2026 = this.flowYear === "all" || this.flowYear === 2026;
        const show2027 = this.flowYear === "all" || this.flowYear === 2027;
        const quarter = this.flowQuarter;
        const search = this.flowSearch;

        const filterMonths = (list) => {
            return list.filter(item => {
                const matchesQuarter = quarter === "all" || item.quarter === quarter;
                if (!matchesQuarter) return false;
                if (!search) return true;
                const assignedMember = this.getSteeringMember(item.inChargeKey);
                const assignedName = assignedMember ? assignedMember.name.toLowerCase() : "";
                return (
                    item.title.toLowerCase().includes(search) ||
                    item.summary.toLowerCase().includes(search) ||
                    item.category.toLowerCase().includes(search) ||
                    item.bylawsRef.toLowerCase().includes(search) ||
                    assignedName.includes(search) ||
                    item.tasks.some(t => t.toLowerCase().includes(search))
                );
            });
        };

        const months2026 = show2026 ? filterMonths(COUNCIL_FLOW_DATA.flow2026) : [];
        const months2027 = show2027 ? filterMonths(COUNCIL_FLOW_DATA.flow2027) : [];

        if (months2026.length === 0 && months2027.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i data-lucide="calendar-x" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                    <p class="text-sm font-semibold">선택하신 조건에 일치하는 월별 추진 과업이 없습니다.</p>
                </div>
            `;
            this.updateIcons();
            return;
        }

        let html = "";

        // 1차년도 (2026년) 렌더링
        if (show2026 && months2026.length > 0) {
            html += `
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl shadow-sm">
                        <div class="flex items-center space-x-3">
                            <span class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                                1차
                            </span>
                            <div>
                                <h3 class="font-black text-base sm:text-lg">
                                    1차년도 : 2026년 추진 로드맵 (조직구성 · 정책발굴 · 예산의견)
                                </h3>
                                <p class="text-xs text-blue-100">회칙 제27조제2항: 조직구성, 기존 정책 검토, 청년의견 수렴, 차년도(2027) 예산수요 제출 중심</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 bg-white/10 rounded-lg">
                            ${months2026.length}개 월 계획
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${months2026.map(m => this.renderMonthCardHTML(m, 2026)).join("")}
                    </div>
                </div>
            `;
        }

        // 2차년도 (2027년) 렌더링
        if (show2027 && months2027.length > 0) {
            html += `
                <div class="space-y-4 pt-6">
                    <div class="flex items-center justify-between p-4 bg-gradient-to-r from-teal-700 to-slate-800 text-white rounded-2xl shadow-sm">
                        <div class="flex items-center space-x-3">
                            <span class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                                2차
                            </span>
                            <div>
                                <h3 class="font-black text-base sm:text-lg">
                                    2차년도 : 2027년 추진 로드맵 (정책제안 심화 · 모니터링 · 본예산반영)
                                </h3>
                                <p class="text-xs text-teal-100">회칙 제27조제3항: 정책제안 완성(6월), 청년정책 모니터링 보고서(7월) 및 시 본예산 정책반영</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 bg-white/10 rounded-lg">
                            ${months2027.length}개 월 계획
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${months2027.map(m => this.renderMonthCardHTML(m, 2027)).join("")}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.updateIcons();
    },

    // 월별 카드 HTML 빌더
    renderMonthCardHTML(item, year) {
        const assignedMember = this.getSteeringMember(item.inChargeKey);
        const assignedName = assignedMember ? assignedMember.name : "운영위원회";
        const assignedRole = assignedMember ? assignedMember.role : item.inChargeRole;

        const categoryBadges = {
            "조직구성": "bg-slate-100 text-slate-700 border-slate-200",
            "임원선출": "bg-blue-100 text-blue-800 border-blue-200",
            "총회·운영위": "bg-indigo-100 text-indigo-800 border-indigo-200",
            "정책스터디": "bg-teal-100 text-teal-800 border-teal-200",
            "의견수렴": "bg-emerald-100 text-emerald-800 border-emerald-200",
            "예산수요": "bg-amber-100 text-amber-800 border-amber-300 font-extrabold",
            "시정제출": "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
            "아이디에이션": "bg-purple-100 text-purple-800 border-purple-200",
            "행사·축제": "bg-pink-100 text-pink-800 border-pink-200",
            "정책발굴": "bg-cyan-100 text-cyan-800 border-cyan-200",
            "제안서보고": "bg-blue-100 text-blue-900 border-blue-300 font-extrabold",
            "성과결산": "bg-slate-100 text-slate-800 border-slate-300",
            "피드백분석": "bg-amber-100 text-amber-800 border-amber-200",
            "제안서보완": "bg-teal-100 text-teal-800 border-teal-200",
            "정기총회": "bg-indigo-100 text-indigo-800 border-indigo-200",
            "현장모니터링": "bg-emerald-100 text-emerald-800 border-emerald-200",
            "제안서완성": "bg-blue-100 text-blue-800 border-blue-200",
            "최종보고": "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
            "최종심의": "bg-purple-100 text-purple-800 border-purple-300 font-extrabold",
            "예산반영": "bg-teal-100 text-teal-800 border-teal-200",
            "성과발표": "bg-pink-100 text-pink-800 border-pink-200",
            "사후점검": "bg-slate-100 text-slate-700 border-slate-200",
            "백서제작": "bg-cyan-100 text-cyan-800 border-cyan-200",
            "임기만료": "bg-slate-200 text-slate-800 border-slate-300"
        };

        const isDeadlineSpecial = item.deadline.includes("마감") || item.deadline.includes("법정");

        return `
            <div class="diff-card bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-teal-400 transition flex flex-col justify-between">
                <div>
                    <!-- 카드 헤더 (월, 분기, 카테고리) -->
                    <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div class="flex items-center space-x-2">
                            <span class="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                ${escapeHtml(item.monthName)}
                            </span>
                            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${categoryBadges[item.category] || 'bg-slate-100 text-slate-700'}">
                                ${escapeHtml(item.category)}
                            </span>
                        </div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">
                            ${year}년 ${escapeHtml(item.quarter)}
                        </span>
                    </div>

                    <!-- 제목 및 요약 -->
                    <h4 class="font-extrabold text-slate-900 text-sm leading-snug mb-1.5 hover:text-teal-600">
                        ${escapeHtml(item.title)}
                    </h4>
                    <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                        ${escapeHtml(item.summary)}
                    </p>

                    <!-- 월별 할 일 체크리스트 -->
                    <div class="space-y-1.5 mb-3">
                        <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">월간 필수 과업 (Checklist):</span>
                        ${item.tasks.map((task, idx) => {
                            const taskId = `task-${year}-${item.month}-${idx}`;
                            const isChecked = !!this.flowCheckedTasks[taskId];
                            return `
                                <div onclick="App.toggleFlowTask('${taskId}')" class="flex items-start space-x-2 p-1.5 rounded-lg hover:bg-slate-100/70 cursor-pointer transition text-xs">
                                    <input type="checkbox" ${isChecked ? "checked" : ""} class="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" onclick="event.stopPropagation(); App.toggleFlowTask('${taskId}')">
                                    <span class="leading-tight ${isChecked ? 'line-through text-slate-400' : 'text-slate-700'}">${escapeHtml(task)}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>

                    <!-- 회칙 근거 및 마감일 배지 -->
                    <div class="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                        <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100" title="근거 조항">
                            ⚖️ ${escapeHtml(item.bylawsRef)}
                        </span>
                        <span class="px-2 py-0.5 rounded ${isDeadlineSpecial ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' : 'bg-slate-100 text-slate-600'}">
                            ⏰ 기한: ${escapeHtml(item.deadline)}
                        </span>
                    </div>
                </div>

                <!-- 담당 운영위원 실명 연동 배지 -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div class="flex items-center space-x-1.5 min-w-0">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">담당:</span>
                        <div class="px-2 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-bold flex items-center space-x-1 truncate">
                            <i data-lucide="user-check" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                            <span class="truncate">${escapeHtml(assignedName)} <span class="font-normal text-[11px] text-teal-700">(${escapeHtml(assignedRole)})</span></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 5번 탭 상단 서브 탭 전환 (운영위원회 / 분과 위원 명단 관리)
    // ==========================================
    switchTab5Sub(subTab) {
        this.tab5Sub = subTab;

        const steeringBtn = document.getElementById("tab5-sub-steering-btn");
        const divisionBtn = document.getElementById("tab5-sub-division-btn");
        const steeringPanel = document.getElementById("tab5-panel-steering");
        const divisionPanel = document.getElementById("tab5-panel-division");

        if (subTab === "steering") {
            if (steeringBtn) {
                steeringBtn.className = "px-6 py-3.5 text-sm font-bold text-white bg-blue-600 border-b-2 border-blue-600 flex items-center gap-2 transition shadow-xs";
            }
            if (divisionBtn) {
                divisionBtn.className = "px-6 py-3.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-b-2 border-transparent flex items-center gap-2 transition";
            }
            if (steeringPanel) steeringPanel.classList.remove("hidden");
            if (divisionPanel) divisionPanel.classList.add("hidden");
            this.renderSteeringMembersGrid();
        } else {
            if (divisionBtn) {
                divisionBtn.className = "px-6 py-3.5 text-sm font-bold text-white bg-violet-600 border-b-2 border-violet-600 flex items-center gap-2 transition shadow-xs";
            }
            if (steeringBtn) {
                steeringBtn.className = "px-6 py-3.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-b-2 border-transparent flex items-center gap-2 transition";
            }
            if (divisionPanel) divisionPanel.classList.remove("hidden");
            if (steeringPanel) steeringPanel.classList.add("hidden");
            this.renderDivisionMembersGrid();
        }
        this.updateIcons();
    },

    // 구버전 호환용
    switchSub4Tab(tab) {
        this.switchTab5Sub(tab);
    },

    // ==========================================
    // 분과 위원 명단 그리드 렌더링
    // ==========================================
    renderDivisionMembersGrid() {
        const grid = document.getElementById("division-members-grid");
        if (!grid) return;

        if (!this.divisionMembers || !this.divisionMembers.length) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 text-sm">등록된 분과 위원이 없습니다. [위원 추가] 버튼으로 추가하세요.</div>`;
            return;
        }

        grid.innerHTML = this.divisionMembers.map(m => `
            <div class="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-violet-400 transition-all shadow-xs flex flex-col justify-between" id="div-card-${escapeHtml(m.id)}">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-extrabold px-2 py-0.5 rounded ${m.role === '분과장' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 border border-violet-200'}">
                            ${escapeHtml(m.role)}
                        </span>
                        <!-- 수정 및 삭제 기능 단추 -->
                        <div class="flex items-center space-x-1 shrink-0">
                            <button
                                type="button"
                                onclick="App.openEditDivisionModal('${escapeHtml(m.id)}')"
                                title="위원 정보 수정"
                                class="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                            >
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button
                                type="button"
                                onclick="App.deleteDivisionMember('${escapeHtml(m.id)}')"
                                title="명단에서 제외/삭제"
                                class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 성명 -->
                    <div class="mt-1 mb-2">
                        <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">성명</label>
                        <p class="text-sm font-black text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded">${escapeHtml(m.name)}</p>
                    </div>

                    <!-- 연락처 (관리자 권한 2232 인증 시에만 표기) -->
                    <div class="mt-2 pt-2 border-t border-slate-200/80">
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-[10px] font-semibold text-slate-500">연락처</label>
                            ${this.isAdmin ? `
                                <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">관리자 인증</span>
                            ` : `
                                <span class="text-[9px] font-medium text-slate-400">비공개</span>
                            `}
                        </div>
                        ${this.isAdmin ? `
                            <div class="flex items-center space-x-1.5 px-2 py-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-emerald-900 text-xs font-bold font-mono">
                                <i data-lucide="phone-call" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i>
                                <span>${escapeHtml(m.phone || '연락처 미등록')}</span>
                            </div>
                        ` : `
                            <div class="flex items-center justify-between px-2 py-1.5 bg-slate-100/80 border border-dashed border-slate-200 rounded-lg text-slate-400 text-[11px]">
                                <span class="flex items-center gap-1.5">
                                    <i data-lucide="lock" class="w-3 h-3 text-slate-400 shrink-0"></i>
                                    <span>관리자 권한 필요</span>
                                </span>
                                <button type="button" onclick="App.toggleAdminAuth()" class="text-[10px] text-blue-600 hover:underline font-bold">인증</button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `).join("");

        this.updateDivisionCounts();
        this.updateIcons();
    },

    // 분과 위원 인원수 갱신
    updateDivisionCounts() {
        const total = this.divisionMembers ? this.divisionMembers.length : 0;
        const el = document.getElementById("division-header-count");
        if (el) el.textContent = `(총 ${total}인)`;

        const tab5DivisionBadge = document.getElementById("tab5-division-badge");
        if (tab5DivisionBadge) tab5DivisionBadge.textContent = total;

        const totalSteering = this.steeringMembers ? this.steeringMembers.length : 0;
        const navMembersBadge = document.getElementById("nav-members-count-badge");
        if (navMembersBadge) navMembersBadge.textContent = `총 ${total + totalSteering}인`;
    },

    // 분과 위원 삭제
    deleteDivisionMember(memberId) {
        const member = this.divisionMembers.find(m => m.id === memberId);
        if (!member) return;
        if (confirm(`'${member.name}' (${member.role}) 위원을 분과 위원 명단에서 삭제하시겠습니까?`)) {
            this.divisionMembers = this.divisionMembers.filter(m => m.id !== memberId);
            this.saveDivisionMembers();
            this.renderDivisionMembersGrid();
        }
    },

    // 분과 위원 수정 모달 열기
    openEditDivisionModal(memberId) {
        const member = this.divisionMembers.find(m => m.id === memberId);
        if (!member) return;

        const title = document.getElementById("division-modal-title");
        if (title) title.textContent = "분과 위원 정보 수정";

        const idInput = document.getElementById("modal-dm-id");
        const nameInput = document.getElementById("modal-dm-name");
        const roleInput = document.getElementById("modal-dm-role");
        const phoneInput = document.getElementById("modal-dm-phone");
        const emailInput = document.getElementById("modal-dm-email");

        if (idInput) idInput.value = member.id;
        if (nameInput) nameInput.value = member.name || "";
        if (roleInput) roleInput.value = member.role || "";
        if (phoneInput) phoneInput.value = member.phone || "";
        if (emailInput) emailInput.value = member.email || "";

        const modal = document.getElementById("division-member-modal");
        if (modal) { modal.classList.remove("hidden"); modal.classList.add("flex"); }
        this.updateIcons();
    },

    // 신규 분과 위원 추가 모달 열기
    openAddDivisionModal() {
        const title = document.getElementById("division-modal-title");
        if (title) title.textContent = "신규 분과 위원 추가";

        const idInput = document.getElementById("modal-dm-id");
        const nameInput = document.getElementById("modal-dm-name");
        const roleInput = document.getElementById("modal-dm-role");
        const phoneInput = document.getElementById("modal-dm-phone");
        const emailInput = document.getElementById("modal-dm-email");

        if (idInput) idInput.value = "";
        if (nameInput) nameInput.value = "";
        if (roleInput) roleInput.value = "위원";
        if (phoneInput) phoneInput.value = "";
        if (emailInput) emailInput.value = "";

        const modal = document.getElementById("division-member-modal");
        if (modal) { modal.classList.remove("hidden"); modal.classList.add("flex"); }
        this.updateIcons();
    },

    // 분과 위원 모달 닫기
    closeDivisionModal() {
        const modal = document.getElementById("division-member-modal");
        if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
    },

    // 분과 위원 모달 저장 (신규/수정)
    saveDivisionMemberFromModal(e) {
        if (e) e.preventDefault();

        const id = document.getElementById("modal-dm-id").value;
        const name = document.getElementById("modal-dm-name").value.trim();
        const role = document.getElementById("modal-dm-role").value.trim();
        const phone = document.getElementById("modal-dm-phone").value.trim();
        const email = document.getElementById("modal-dm-email").value.trim();

        if (!name || !role) {
            alert("성명과 직책은 필수 입력 항목입니다.");
            return;
        }

        if (id) {
            const member = this.divisionMembers.find(m => m.id === id);
            if (member) {
                member.name = name;
                member.role = role;
                member.phone = phone;
                member.email = email;
            }
        } else {
            this.divisionMembers.push({
                id: "dm-" + Date.now(),
                name,
                role,
                phone,
                email
            });
        }

        this.saveDivisionMembers();
        this.closeDivisionModal();
        this.renderDivisionMembersGrid();

        alert(id ? "분과 위원 정보가 수정되었습니다." : "신규 분과 위원이 추가되었습니다.");
    },

    // 분과 위원 명단 기본값 복원
    resetDivisionMembers() {
        if (confirm("분과 위원 명단을 초기값(엑셀 원본)으로 복원하시겠습니까?")) {
            this.divisionMembers = JSON.parse(JSON.stringify(DIVISION_MEMBERS_INITIAL));
            this.saveDivisionMembers();
            this.renderDivisionMembersGrid();
        }
    },

    // ==========================================
    // 플랫폼 전체 관리자 권한 인증 (비밀번호: 2232, 모바일/PC 완벽 호환)
    // ==========================================
    toggleAdminAuth() {
        this.openAdminModal();
    },

    openAdminModal() {
        if (this.isAdmin) {
            if (confirm("관리자 권한을 해제(로그아웃)하시겠습니까?\n위원들의 연락처가 즉시 비공개로 전환됩니다.")) {
                this.isAdmin = false;
                sessionStorage.removeItem("dongtan_admin_auth");
                this.updateAdminUI();
                this.renderDivisionMembersGrid();
                alert("관리자 권한이 안전하게 해제되었습니다.");
            }
            return;
        }

        const modal = document.getElementById("admin-auth-modal");
        const input = document.getElementById("admin-password-input");
        const errorMsg = document.getElementById("admin-auth-error-msg");

        if (input) input.value = "";
        if (errorMsg) errorMsg.classList.add("hidden");

        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            setTimeout(() => {
                if (input) input.focus();
            }, 100);
        }
        this.updateIcons();
    },

    closeAdminModal() {
        const modal = document.getElementById("admin-auth-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    submitAdminAuth(e) {
        if (e) e.preventDefault();
        const input = document.getElementById("admin-password-input");
        const errorMsg = document.getElementById("admin-auth-error-msg");
        const pwd = (input ? input.value : "").trim();

        if (pwd === "2232") {
            this.isAdmin = true;
            sessionStorage.setItem("dongtan_admin_auth", "true");
            this.closeAdminModal();
            this.updateAdminUI();
            this.renderDivisionMembersGrid();
            alert("✅ 관리자 권한이 정상 승인되었습니다.\n분과위원 연락처가 즉시 공개 표기됩니다.");
        } else {
            if (errorMsg) errorMsg.classList.remove("hidden");
            if (input) {
                input.value = "";
                input.focus();
            }
        }
    },

    // 좌측 사이드바 관리자 권한 단추 UI 상태 갱신
    updateAdminUI() {
        const btn = document.getElementById("admin-auth-btn");
        if (!btn) return;

        if (this.isAdmin) {
            btn.className = "w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition shadow-xs";
            btn.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i data-lucide="unlock" class="w-4 h-4 text-emerald-600"></i>
                    <span>관리자 권한 실행 중</span>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-extrabold">해제</span>
            `;
        } else {
            btn.className = "w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-xs group";
            btn.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i data-lucide="lock" class="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition"></i>
                    <span>관리자 권한 실행</span>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold group-hover:bg-blue-50 group-hover:text-blue-700 transition">인증</span>
            `;
        }
        this.updateIcons();
    },

    renderAll() {
        this.renderPadletBoard();
        this.renderMcpPolicyList();
        this.renderProposalSelector();
        this.renderUploadedFilesList();
        this.renderSteeringMembersGrid();
        this.renderDivisionMembersGrid();
        this.renderCouncilFlow();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});
