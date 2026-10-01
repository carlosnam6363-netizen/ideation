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
    trashPrograms: [],
    currentProgramDetailId: null,
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
    surveyChartViewMode: "visual",
    iconDebounceTimer: null,

    // 4번 탭 (협의체 전체 플로우) 상태
    flowYear: 2026, // "all", 2026, 2027
    flowQuarter: "all", // "all", "Q1", "Q2", "Q3", "Q4"
    flowSearch: "",
    flowCheckedTasks: {},

    // 5번 탭 (위원 명단 관리: 운영위, 분과위원, 홍보팀) 상태
    steeringMembers: [],
    divisionMembers: [],   // 분과 위원 명단
    prMembers: [],         // 홍보팀 명단 (팀장: 김나연 분과장, 팀원: 유연주 병점구 위원)
    tab5Sub: "division",   // 5번 탭의 활성 서브 탭 (기본값: "division")

    // 3번 탭 (회칙 정리) 보안 인증 상태 (비밀번호: 1123)
    isBylawsAuthenticated: sessionStorage.getItem("dongtan_bylaws_auth") === "true",

    // 관리자 권한 상태
    isAdmin: sessionStorage.getItem("dongtan_admin_auth") === "true",

    init() {
        this.loadStorage();
        this.setupNavigation();
        this.setupPadlet();
        this.setupIdeation();
        this.setupBylaws();
        this.setupCouncilFlow();
        this.setupProgramDraft();
        this.renderAll();
        this.updateAdminUI();
        this.updateBylawsAuthUI();
        this.updateIcons();
    },

    // 토스트 알림 (사용자 경험 개선: Toast Notification)
    showToast(message, type = 'info', duration = 3200) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        const typeClasses = {
            success: "toast-success",
            error: "toast-error",
            warning: "toast-warning",
            info: "toast-info"
        };
        const icons = {
            success: '<i data-lucide="check-circle-2" class="w-4 h-4 shrink-0 text-white"></i>',
            error: '<i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-white"></i>',
            warning: '<i data-lucide="alert-triangle" class="w-4 h-4 shrink-0 text-white"></i>',
            info: '<i data-lucide="info" class="w-4 h-4 shrink-0 text-white"></i>'
        };

        toast.className = `toast-item ${typeClasses[type] || 'toast-info'}`;
        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="leading-tight">${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);
        this.updateIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, duration);
    },

    // Lucide 아이콘 렌더링 최적화 (배치 처리 & 안전 예외 처리)
    updateIcons() {
        if (typeof lucide === "undefined") return;
        if (this.iconDebounceTimer) cancelAnimationFrame(this.iconDebounceTimer);
        this.iconDebounceTimer = requestAnimationFrame(() => {
            try {
                lucide.createIcons();
            } catch(e) {
                console.warn("Lucide icon create warning:", e);
            }
            this.iconDebounceTimer = null;
        });
    },

    // 로컬스토리지 불러오기 및 초기화
    loadStorage() {
        try {
            const savedPrograms = localStorage.getItem("dongtan_padlet_programs");
            this.programs = savedPrograms ? JSON.parse(savedPrograms) : [...DONGTAN_DATA.initialPrograms];
            // 동탄구 교육·참여·권리 분과장 김남현으로 자동 동기화 및 공공 사업카드 표준 필드 보강
            this.programs.forEach(p => {
                if (p.memberId === 1 && (p.author || '').includes("강현우")) {
                    p.author = "김남현 (분과장)";
                }
                if (typeof DONGTAN_DATA !== "undefined" && DONGTAN_DATA.initialPrograms) {
                    const match = DONGTAN_DATA.initialPrograms.find(dp => dp.id === p.id);
                    if (match) {
                        if (!p.code) p.code = match.code;
                        if (!p.vision) p.vision = match.vision || p.subtitle;
                        if (!p.subtitle) p.subtitle = match.subtitle || match.vision;
                        if (!p.targetGoal) p.targetGoal = match.targetGoal;
                        if (!p.basis) p.basis = match.basis;
                        if (!p.period) p.period = match.period || p.schedule;
                        if (!p.location) p.location = match.location || p.institution;
                        if (!p.target) p.target = match.target;
                        if (!p.agency) p.agency = match.agency;
                        if (!p.subPrograms || !p.subPrograms.length) p.subPrograms = match.subPrograms;
                        if (!p.prevPerformance || !p.prevPerformance.length) p.prevPerformance = match.prevPerformance;
                        if (!p.plan2027 || !p.plan2027.length) p.plan2027 = match.plan2027;
                        if (!p.budgetRatio) p.budgetRatio = match.budgetRatio;
                        if (!p.budgetTable || !p.budgetTable.length) p.budgetTable = match.budgetTable;
                        if (!p.department) p.department = match.department;
                        if (!p.contact) p.contact = match.contact;
                    }
                }

                // 각 교육제안별 추천(좋아요) 위원 명단(likedBy) 초기화 및 1인 1회 투표 데이터셋 보장
                if (!Array.isArray(p.likedBy)) {
                    p.likedBy = [];
                    // 초기 시드 추천 위원 배정 (화면에서 추천 위원 명단 즉시 확인 가능)
                    const seedVoters = [
                        { memberId: "dm-1", name: "김남현", role: "분과장" },
                        { memberId: "dm-2", name: "박고은", role: "위원" },
                        { memberId: "dm-3", name: "채윤규", role: "위원" },
                        { memberId: "dm-4", name: "음시연", role: "위원" },
                        { memberId: "dm-5", name: "유소연", role: "위원" },
                        { memberId: "dm-6", name: "조찬우", role: "위원" }
                    ];
                    const seedCount = Math.min(Math.max(1, p.likes || 2), 3);
                    for (let i = 0; i < seedCount; i++) {
                        const voter = seedVoters[(p.id.charCodeAt(p.id.length - 1) + i) % seedVoters.length];
                        if (!p.likedBy.some(v => v.name === voter.name)) {
                            p.likedBy.push({
                                memberId: voter.memberId,
                                name: voter.name,
                                role: voter.role,
                                votedAt: "2026-10-01T09:00:00.000Z"
                            });
                        }
                    }
                }
                p.likes = p.likedBy.length;
            });
            this.savePrograms();
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

        // 5. 홍보팀 명단 불러오기 (팀장: 김나연 분과장, 팀원: 유연주 병점구 위원)
        try {
            const savedPR = localStorage.getItem("dongtan_pr_members");
            if (savedPR && typeof PR_MEMBERS_INITIAL !== "undefined") {
                const parsed = JSON.parse(savedPR);
                this.prMembers = Array.isArray(parsed) && parsed.length > 0 ? parsed : JSON.parse(JSON.stringify(PR_MEMBERS_INITIAL));
            } else if (typeof PR_MEMBERS_INITIAL !== "undefined") {
                this.prMembers = JSON.parse(JSON.stringify(PR_MEMBERS_INITIAL));
                this.savePrMembers();
            }
        } catch {
            if (typeof PR_MEMBERS_INITIAL !== "undefined") {
                this.prMembers = JSON.parse(JSON.stringify(PR_MEMBERS_INITIAL));
            }
        }

        // 6. 휴지통 목록 불러오기 및 30일 만료 항목 자동 영구 삭제
        try {
            const savedTrash = localStorage.getItem("dongtan_trash_programs");
            this.trashPrograms = savedTrash ? JSON.parse(savedTrash) : [];
            this.cleanExpiredTrash();
        } catch {
            this.trashPrograms = [];
        }
    },

    savePrMembers() {
        try {
            localStorage.setItem("dongtan_pr_members", JSON.stringify(this.prMembers));
        } catch (e) {
            console.warn("홍보팀 명단 저장 실패:", e);
        }
    },

    savePrograms() {
        try {
            localStorage.setItem("dongtan_padlet_programs", JSON.stringify(this.programs));
        } catch (e) {
            console.warn("로컬스토리지 저장 용량 초과 또는 권한 문제:", e);
        }
    },

    saveTrash() {
        try {
            localStorage.setItem("dongtan_trash_programs", JSON.stringify(this.trashPrograms));
        } catch (e) {
            console.warn("휴지통 저장 실패:", e);
        }
        this.updateTrashBadge();
    },

    cleanExpiredTrash() {
        const now = Date.now();
        const initialCount = (this.trashPrograms || []).length;
        this.trashPrograms = (this.trashPrograms || []).filter(p => {
            if (!p.expiresAt) return true;
            return new Date(p.expiresAt).getTime() > now;
        });
        if (this.trashPrograms.length !== initialCount) {
            this.saveTrash();
        }
        this.updateTrashBadge();
    },

    updateTrashBadge() {
        const count = (this.trashPrograms || []).length;
        const navBadge = document.getElementById("nav-trash-count-badge");
        if (navBadge) {
            navBadge.textContent = `${count}건`;
            if (count > 0) {
                navBadge.className = "ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold shrink-0";
            } else {
                navBadge.className = "ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-bold shrink-0";
            }
        }
        const tab1Badge = document.getElementById("tab1-trash-count-badge");
        if (tab1Badge) {
            tab1Badge.textContent = count;
        }
        const totalEl = document.getElementById("trash-total-count");
        if (totalEl) {
            totalEl.textContent = `${count}건`;
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
                    if (targetTab === "tab-3" && !this.isBylawsAuthenticated) {
                        this.openBylawsAuthModal();
                        return;
                    }
                    this.switchTab(targetTab);
                    // 모바일 화면에서는 탭 선택 후 사이드바 메뉴 자동 닫기
                    if (window.innerWidth < 1024) {
                        this.closeMobileSidebar();
                    }
                }
            });
        });

        // 사이드바 내부 모바일 토글 버튼
        const mobileToggleBtn = document.getElementById("mobile-sidebar-toggle-btn");
        if (mobileToggleBtn) {
            mobileToggleBtn.addEventListener("click", () => {
                this.toggleMobileSidebar();
            });
        }

        // 상단 헤더의 모바일 햄버거 메뉴 버튼
        const headerMobileBtn = document.getElementById("header-mobile-menu-btn");
        if (headerMobileBtn) {
            headerMobileBtn.addEventListener("click", () => {
                this.toggleMobileSidebar();
            });
        }

        // 모바일/PC 공통 모달 배경 클릭 및 ESC 키 닫기 지원 (모바일 터치 닫기 지원)
        const modalBackdrops = [
            { id: "program-modal", close: () => this.closeProgramModal() },
            { id: "program-detail-modal", close: () => this.closeProgramDetailModal() },
            { id: "steering-member-modal", close: () => this.closeSteeringModal() },
            { id: "division-member-modal", close: () => this.closeDivisionModal() },
            { id: "admin-auth-modal", close: () => this.closeAdminModal() },
            { id: "bylaws-auth-modal", close: () => this.closeBylawsAuthModal() },
            { id: "like-vote-modal", close: () => this.closeLikeVoteModal() },
            { id: "liked-by-modal", close: () => this.closeLikedByModal() },
            { id: "comment-modal", close: () => this.closeCommentModal() },
            { id: "cloud-sync-modal", close: () => this.closeCloudSyncModal() }
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
                this.closeProgramDetailModal();
                this.closeSteeringModal();
                this.closeDivisionModal();
                this.closeAdminModal();
                this.closeBylawsAuthModal();
                this.closeLikeVoteModal();
                this.closeLikedByModal();
                this.closeCommentModal();
                this.closeCloudSyncModal();
                this.closeMobileSidebar();
            }
        });
    },

    toggleMobileSidebar() {
        const sidebar = document.getElementById("main-sidebar");
        const backdrop = document.getElementById("mobile-sidebar-backdrop");
        if (!sidebar) return;

        const isClosed = sidebar.classList.contains("-translate-x-full");
        if (isClosed) {
            sidebar.classList.remove("-translate-x-full");
            sidebar.classList.add("translate-x-0");
            if (backdrop) backdrop.classList.remove("hidden");
            document.body.classList.add("overflow-hidden");
        } else {
            sidebar.classList.add("-translate-x-full");
            sidebar.classList.remove("translate-x-0");
            if (backdrop) backdrop.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
        }
        this.updateIcons();
    },

    closeMobileSidebar() {
        const sidebar = document.getElementById("main-sidebar");
        const backdrop = document.getElementById("mobile-sidebar-backdrop");
        if (sidebar && window.innerWidth < 1024) {
            sidebar.classList.add("-translate-x-full");
            sidebar.classList.remove("translate-x-0");
        }
        if (backdrop) backdrop.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
    },

    openProgramModal(progId = null) {
        const modal = document.getElementById("program-modal");
        if (!modal) return;
        this.populateMemberSelect();
        const form = document.getElementById("new-program-form");
        const titleEl = document.getElementById("program-modal-title");
        const editingInput = document.getElementById("program-editing-id");

        if (progId) {
            const prog = this.programs.find(p => p.id === progId);
            if (prog && form) {
                if (titleEl) titleEl.textContent = "2027년 교육 프로그램 사업카드 수정";
                if (editingInput) editingInput.value = prog.id;
                if (form.elements["memberId"]) form.elements["memberId"].value = String(prog.memberId);
                if (form.elements["category"]) form.elements["category"].value = prog.category || "교육";
                if (form.elements["code"]) form.elements["code"].value = prog.code || "";
                if (form.elements["title"]) form.elements["title"].value = prog.title || "";
                if (form.elements["subtitle"]) form.elements["subtitle"].value = prog.vision || prog.subtitle || "";
                if (form.elements["targetGoal"]) form.elements["targetGoal"].value = prog.targetGoal || "";
                if (form.elements["basis"]) form.elements["basis"].value = prog.basis || "";
                if (form.elements["schedule"]) form.elements["schedule"].value = prog.period || prog.schedule || "";
                if (form.elements["institution"]) form.elements["institution"].value = prog.location || prog.institution || "";
                if (form.elements["target"]) form.elements["target"].value = prog.target || "";
                if (form.elements["purpose"]) form.elements["purpose"].value = prog.purpose || "";
                if (form.elements["agency"]) form.elements["agency"].value = prog.agency || "";
                if (form.elements["format"]) form.elements["format"].value = prog.format || "";
                
                const subText = (prog.subPrograms || []).map(s => `${s.cat || '과정'} | ${s.name || ''} | ${s.desc || ''}`).join("\n");
                if (form.elements["subProgramsText"]) form.elements["subProgramsText"].value = subText;
                
                const prevText = (prog.prevPerformance || []).join("\n");
                if (form.elements["prevPerformanceText"]) form.elements["prevPerformanceText"].value = prevText;
                
                const planText = (prog.plan2027 || []).join("\n");
                if (form.elements["plan2027Text"]) form.elements["plan2027Text"].value = planText;
                
                const budgetText = prog.budgetRatio || "시비 100%";
                if (form.elements["budgetInfo"]) form.elements["budgetInfo"].value = budgetText;
                
                if (form.elements["tags"]) form.elements["tags"].value = (prog.tags || []).join(", ");
            }
            const banner = document.getElementById("program-draft-banner");
            if (banner) banner.classList.add("hidden");
        } else {
            if (form) form.reset();
            if (titleEl) titleEl.textContent = "2027년 교육 프로그램 사업카드 작성";
            if (editingInput) editingInput.value = "";
            if (form && form.elements["code"]) form.elements["code"].value = `1-${this.programs.length + 1}`;
            if (form && form.elements["basis"]) form.elements["basis"].value = "「화성시 청년 기본 조례」 제21조, 「청년일자리 창출 촉진 조례」 제6조";
            if (form && form.elements["agency"]) form.elements["agency"].value = "화성시 청년청소년과 / 교육·참여·권리 분과 직접사업";
            if (form && form.elements["budgetInfo"]) form.elements["budgetInfo"].value = "시비 100%, 25,000천원";

            // 임시 저장본 확인
            const draft = localStorage.getItem("dongtan_program_draft");
            const banner = document.getElementById("program-draft-banner");
            if (draft && banner) {
                banner.classList.remove("hidden");
            } else if (banner) {
                banner.classList.add("hidden");
            }
        }

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        this.updateIcons();
        setTimeout(() => {
            const titleInput = modal.querySelector('input[name="title"]');
            if (titleInput) titleInput.focus();
        }, 100);
    },

    closeProgramModal() {
        const modal = document.getElementById("program-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    // 임시 저장(Draft) 자동 감지 및 복원/삭제 관리
    setupProgramDraft() {
        const form = document.getElementById("new-program-form");
        if (!form) return;

        let debounceTimer;
        form.addEventListener("input", () => {
            const editingId = form.elements["editingId"] ? form.elements["editingId"].value : "";
            if (editingId) return; // 수정 모드일 땐 자동저장 비활성

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const draftData = {};
                Array.from(form.elements).forEach(el => {
                    if (el.name && el.name !== "editingId") {
                        draftData[el.name] = el.value;
                    }
                });
                if (draftData.title || draftData.purpose || draftData.subtitle) {
                    localStorage.setItem("dongtan_program_draft", JSON.stringify(draftData));
                }
            }, 600);
        });
    },

    restoreProgramDraft() {
        const saved = localStorage.getItem("dongtan_program_draft");
        if (!saved) return;
        try {
            const data = JSON.parse(saved);
            const form = document.getElementById("new-program-form");
            if (!form) return;
            Object.keys(data).forEach(key => {
                if (form.elements[key]) {
                    form.elements[key].value = data[key];
                }
            });
            const banner = document.getElementById("program-draft-banner");
            if (banner) banner.classList.add("hidden");
            this.showToast("작성 중이던 임시 저장본을 성공적으로 불러왔습니다.", "info");
        } catch(e) {
            console.warn("임시 저장본 복원 실패:", e);
        }
    },

    discardProgramDraft() {
        localStorage.removeItem("dongtan_program_draft");
        const banner = document.getElementById("program-draft-banner");
        if (banner) banner.classList.add("hidden");
        this.showToast("임시 저장본이 안전하게 삭제되었습니다.", "info");
    },

    openProgramDetailModal(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;
        this.currentProgramDetailId = progId;
        const area = document.getElementById("printable-program-card-area");
        if (area) {
            area.innerHTML = this.renderProgramReportCardHTML(prog);
        }
        const modal = document.getElementById("program-detail-modal");
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }
        this.updateIcons();
    },

    closeProgramDetailModal() {
        const modal = document.getElementById("program-detail-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
        this.currentProgramDetailId = null;
    },

    // 한글(HWP) 및 문서 서식용 텍스트 복사 (P3 편의 기능)
    copyCurrentProgramCardHwp() {
        if (!this.currentProgramDetailId) return;
        const prog = this.programs.find(p => p.id === this.currentProgramDetailId);
        if (!prog) return;

        const hwpText = `【2027년 주요 청년사업 설명서 (교육·참여·권리 분과)】

1. 사업 기본 정보
- 사 업 명: [${prog.code || '1-1'}] ${prog.title}
- 핵심비전: ${prog.subtitle || prog.vision || '동탄 청년 맞춤형 역량 강화'}
- 제안위원: ${prog.author || '위원'}
- 분과구분: 교육, 참여, 권리 분과 (${prog.category || '교육'})
- 추진목표: ${prog.targetGoal || '청년 역량 강화 및 시정 참여 실현'}

2. 사업 개요
- 추진근거: ${prog.basis || '「화성시 청년 기본 조례」 제21조'}
- 사업기간: ${prog.schedule || prog.period || '2027. 1. ~ 12.'}
- 추진장소: ${prog.institution || prog.location || '화성시 동탄 청년공간'}
- 사업대상: ${prog.target || '화성시 거주 및 활동 19세~39세 청년'}
- 사업예산: ${prog.budgetInfo || prog.budgetRatio || '시비 100%'}
- 추진부서: ${prog.agency || '화성시 청년청소년과 / 교육·참여·권리 분과'}

3. 사업 필요성 및 추진 목적
${prog.purpose || '청년들의 교육 참여 수요를 반영하여 실무 역량을 제고함.'}

4. 주요 교육 프로그램 세부 구성
${(prog.subPrograms || []).map((s, idx) => ` (${idx+1}) [${s.cat || '과정'}] ${s.name}: ${s.desc}`).join('\n')}

5. 추진 실적 및 2027년 추진 계획
[추진실적]
${(prog.prevPerformance || []).map(p => ` - ${p}`).join('\n')}
[2027년 추진일정]
${(prog.plan2027 || []).map(p => ` - ${p}`).join('\n')}

6. 기대 효과
${prog.effects || '청년 정주여건 개선 및 실무 역량 강화'}
`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hwpText).then(() => {
                this.showToast("한글(HWP) 표 서식용 텍스트가 클립보드에 복사되었습니다! (한글 문서에 Ctrl+V로 붙여넣기)", "success");
            }).catch(() => {
                this.showToast("클립보드 복사에 실패했습니다.", "error");
            });
        } else {
            this.showToast("클립보드 API가 지원되지 않는 환경입니다.", "warning");
        }
    },

    printCurrentProgramCard() {
        window.print();
    },

    editCurrentProgramCard() {
        if (!this.currentProgramDetailId) return;
        const targetId = this.currentProgramDetailId;
        this.closeProgramDetailModal();
        this.openProgramModal(targetId);
    },

    deleteCurrentProgramCardToTrash() {
        if (!this.currentProgramDetailId) return;
        const targetId = this.currentProgramDetailId;
        this.closeProgramDetailModal();
        this.deleteProgramToTrash(targetId);
    },

    switchTab(tabId) {
        if (tabId === "tab-3" && !this.isBylawsAuthenticated) {
            this.openBylawsAuthModal();
            return;
        }

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
            "tab-5": "5. 위원 명단 관리 (운영위원회 & 분과위원)",
            "tab-6": "6. 휴지통 (삭제된 교육 제안 30일 보관함)"
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
            this.animateSurveyBars();
            if (this.surveyChartViewMode === "chart") {
                setTimeout(() => this.renderSurveyChart(), 100);
            }
        } else if (tabId === "tab-3") {
            this.renderBylawsDiff();
        } else if (tabId === "tab-4") {
            this.renderCouncilFlow();
        } else if (tabId === "tab-5") {
            this.switchTab5Sub(this.tab5Sub || "division");
        } else if (tabId === "tab-6") {
            this.renderTrashPanel();
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
        const form = document.getElementById("new-program-form");

        if (openModalBtn) {
            openModalBtn.addEventListener("click", () => this.openProgramModal());
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", () => this.closeProgramModal());
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
        if (!select) return;
        const membersList = (this.divisionMembers && this.divisionMembers.length)
            ? this.divisionMembers
            : (typeof DONGTAN_DATA !== "undefined" ? DONGTAN_DATA.members : []);
        if (!membersList || !membersList.length) return;
        select.innerHTML = membersList.map(m => 
            `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.role || '위원')} - ${escapeHtml(m.field || m.department || '교육·참여·권리')})</option>`
        ).join("");
    },

    handleCreateProgram(form) {
        if (!form) form = document.getElementById("new-program-form");
        if (!form) return;

        const editingId = form.elements["editingId"] ? form.elements["editingId"].value : "";
        const rawMemberId = form.elements["memberId"] ? form.elements["memberId"].value : "";
        const memberId = (!isNaN(Number(rawMemberId)) && rawMemberId !== "") ? Number(rawMemberId) : rawMemberId;

        const member = (this.divisionMembers && this.divisionMembers.find(m => String(m.id) === String(rawMemberId) || m.name === rawMemberId))
            || (typeof DONGTAN_DATA !== "undefined" && DONGTAN_DATA.members.find(m => String(m.id) === String(rawMemberId) || m.name === rawMemberId))
            || { name: "제안위원", role: "위원", phone: "010-3351-6363" };

        const title = form.elements["title"] ? form.elements["title"].value.trim() : "";
        const subtitle = form.elements["subtitle"] ? form.elements["subtitle"].value.trim() : "";
        const targetGoal = form.elements["targetGoal"] ? form.elements["targetGoal"].value.trim() : "";
        const category = form.elements["category"] ? form.elements["category"].value : "교육";
        const code = form.elements["code"] && form.elements["code"].value.trim() ? form.elements["code"].value.trim() : `1-${this.programs.length + 1}`;
        const basis = form.elements["basis"] ? form.elements["basis"].value.trim() : "「화성시 청년 기본 조례」 제21조";
        const schedule = form.elements["schedule"] ? form.elements["schedule"].value.trim() : "2027. 1. ~ 12.";
        const institution = form.elements["institution"] ? form.elements["institution"].value.trim() : "화성시 동탄 청년공간";
        const target = form.elements["target"] ? form.elements["target"].value.trim() : "화성시 거주 및 활동 19세 ~ 39세 청년";
        const purpose = form.elements["purpose"] ? form.elements["purpose"].value.trim() : "";
        const agency = form.elements["agency"] ? form.elements["agency"].value.trim() : "화성시 청년청소년과 / 교육·참여·권리 분과 직접사업";
        const format = form.elements["format"] ? form.elements["format"].value.trim() : "오프라인 실무";
        const budgetInfo = form.elements["budgetInfo"] ? form.elements["budgetInfo"].value.trim() : "시비 100%";

        if (!title || !purpose) {
            if (!title && form.elements["title"]) {
                form.elements["title"].classList.add("input-error-shake");
                form.elements["title"].focus();
                setTimeout(() => form.elements["title"].classList.remove("input-error-shake"), 600);
                this.showToast("필수 항목 [사업명]을 입력해주세요.", "error");
            } else if (!purpose && form.elements["purpose"]) {
                form.elements["purpose"].classList.add("input-error-shake");
                form.elements["purpose"].focus();
                setTimeout(() => form.elements["purpose"].classList.remove("input-error-shake"), 600);
                this.showToast("필수 항목 [사업 필요성 및 추진목적]을 입력해주세요.", "error");
            }
            return;
        }

        const subText = form.elements["subProgramsText"] ? form.elements["subProgramsText"].value.trim() : "";
        let subPrograms = [];
        if (subText) {
            subPrograms = subText.split("\n").map(line => {
                const parts = line.split("|").map(s => s.trim());
                if (parts.length >= 3) {
                    return { cat: parts[0], name: parts[1], desc: parts[2] };
                } else if (parts.length === 2) {
                    return { cat: "프로그램", name: parts[0], desc: parts[1] };
                } else if (parts[0]) {
                    return { cat: "교육내용", name: parts[0], desc: "" };
                }
                return null;
            }).filter(Boolean);
        }
        if (!subPrograms.length) {
            subPrograms = [
                { cat: "기초실무", name: title + " 기초과정", desc: "이론 및 필수 실무 기초 교육" },
                { cat: "실무심화", name: title + " 실무프로젝트", desc: "현업 문제 해결형 프로젝트" }
            ];
        }

        const prevText = form.elements["prevPerformanceText"] ? form.elements["prevPerformanceText"].value.trim() : "";
        const prevPerformance = prevText ? prevText.split("\n").map(s => s.trim()).filter(Boolean) : [
            "2026. 10. 동탄 청년 대상 본 사업 사전 수요조사 완료 (응답 청년 85% 이상 필요 응답)"
        ];

        const planText = form.elements["plan2027Text"] ? form.elements["plan2027Text"].value.trim() : "";
        const plan2027 = planText ? planText.split("\n").map(s => s.trim()).filter(Boolean) : [
            `2027. 1. ~ 2. : 사업계획 수립 및 교육생 모집`,
            `2027. 4. ~ 6. : ${title} 본 과정 집중 운영`,
            `2027. 7. ~ 8. : 성과평가 및 사후지원`
        ];

        const tagsInput = form.elements["tags"] ? form.elements["tags"].value.trim() : "";
        const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : ["2027교육"];

        if (editingId) {
            const existing = this.programs.find(p => p.id === editingId);
            if (existing) {
                existing.memberId = memberId;
                existing.author = `${member.name} (${member.role || '위원'})`;
                existing.contact = member.phone || member.contact || existing.contact || "010-3351-6363";
                existing.code = code;
                existing.title = title;
                existing.subtitle = subtitle;
                existing.vision = subtitle || existing.vision;
                existing.targetGoal = targetGoal || existing.targetGoal;
                existing.category = category;
                existing.basis = basis;
                existing.period = schedule;
                existing.schedule = schedule;
                existing.location = institution;
                existing.institution = institution;
                existing.target = target;
                existing.purpose = purpose;
                existing.agency = agency;
                existing.format = format;
                existing.subPrograms = subPrograms;
                existing.prevPerformance = prevPerformance;
                existing.plan2027 = plan2027;
                existing.budgetRatio = budgetInfo;
                existing.tags = tags;
            }
        } else {
            const newProg = {
                id: "prog-" + Date.now(),
                code: code,
                memberId: memberId,
                author: `${member.name} (${member.role || '위원'})`,
                contact: member.phone || member.contact || "010-3351-6363",
                title: title,
                subtitle: subtitle,
                vision: subtitle || "청년 역량 강화 및 실무 연계 지원",
                targetGoal: targetGoal || "연간 교육생 및 참여자 30명, 만족도 4.5점 이상",
                category: category,
                basis: basis,
                period: schedule,
                schedule: schedule,
                location: institution,
                institution: institution,
                target: target,
                purpose: purpose,
                agency: agency,
                format: format,
                subPrograms: subPrograms,
                prevPerformance: prevPerformance,
                plan2027: plan2027,
                budgetRatio: budgetInfo,
                budgetTable: [
                    { item: "◇ 사 업 비", prev: "20,000", curr: "22,000", exec: "21,000", next: "25,000" },
                    { item: " - 강사료 및 멘토링비", prev: "10,000", curr: "11,000", exec: "10,800", next: "12,500" },
                    { item: " - 실습장비 및 교재비", prev: "6,000", curr: "6,500", exec: "6,200", next: "7,500" },
                    { item: " - 운영비 및 사후관리", prev: "4,000", curr: "4,500", exec: "4,000", next: "5,000" }
                ],
                department: "청년청소년과 / 교육·참여·권리 분과",
                likes: 1,
                status: "제안됨",
                tags: tags,
                comments: []
            };
            this.programs.unshift(newProg);
        }

        // 임시 저장본 제거
        localStorage.removeItem("dongtan_program_draft");

        this.savePrograms();
        this.renderPadletBoard();
        this.closeProgramModal();
        this.showToast(editingId ? "교육 프로그램 사업카드가 성공적으로 수정되었습니다!" : "2027년 교육 프로그램 사업카드가 패들렛 보드에 성공적으로 등록되었습니다!", "success");
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
                (p.title && p.title.toLowerCase().includes(kw)) ||
                (p.subtitle && p.subtitle.toLowerCase().includes(kw)) ||
                (p.author && p.author.toLowerCase().includes(kw)) ||
                (p.purpose && p.purpose.toLowerCase().includes(kw)) ||
                ((p.tags || []).some(t => t.toLowerCase().includes(kw)))
            );
        });

        if (this.padletViewMode === "columns") {
            container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6 overflow-x-auto";
            
            const membersList = (this.divisionMembers && this.divisionMembers.length)
                ? this.divisionMembers
                : (typeof DONGTAN_DATA !== "undefined" ? DONGTAN_DATA.members : []);

            const defaultGradients = [
                "from-blue-600 to-indigo-600", "from-teal-600 to-emerald-600", "from-indigo-600 to-violet-600",
                "from-sky-600 to-blue-600", "from-violet-600 to-purple-600", "from-amber-600 to-orange-600",
                "from-emerald-600 to-teal-600", "from-cyan-600 to-blue-600", "from-fuchsia-600 to-pink-600",
                "from-purple-600 to-indigo-600", "from-rose-600 to-pink-600", "from-blue-700 to-slate-700"
            ];

            container.innerHTML = membersList.map((member, mIdx) => {
                const memberPrograms = filtered.filter(p => 
                    String(p.memberId) === String(member.id) ||
                    (p.author && (p.author.startsWith(member.name) || p.author.includes(member.name))) ||
                    (mIdx === 0 && (!p.memberId || p.memberId === "NaN"))
                );
                const colorGradient = member.color || defaultGradients[mIdx % defaultGradients.length];
                const memberRole = member.role || "위원";
                const isLeader = memberRole.includes("분과장");

                return `
                    <div class="padlet-column p-4 flex flex-col">
                        <div class="flex items-center space-x-3 mb-4 p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${colorGradient} text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                                ${escapeHtml(member.name.slice(0, 2))}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center space-x-2">
                                    <h4 class="font-bold text-slate-800 text-sm truncate">${escapeHtml(member.name)}</h4>
                                    <span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${isLeader ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                                        ${escapeHtml(memberRole)}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-500 truncate" title="${escapeHtml(member.field || member.department || '교육·참여·권리')}">${escapeHtml(member.field || member.department || '교육·참여·권리')}</p>
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
                                    <button onclick="App.openModalForMember('${escapeHtml(String(member.id))}')" class="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
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
                container.innerHTML = filtered.map(prog => this.renderPadletCardHTML(prog)).join("") ;
            }
        }

        this.updateIcons();
    },

    renderPadletCardHTML(prog) {
        const catBadgeColors = {
            "교육": "bg-blue-100 text-blue-800 border-blue-200",
            "참여": "bg-emerald-100 text-emerald-800 border-emerald-200",
            "권리": "bg-purple-100 text-purple-800 border-purple-200",
            "기타": "bg-amber-100 text-amber-800 border-amber-200"
        };
        const statusBadge = {
            "2027 확정안": "bg-green-100 text-green-700 border-green-300",
            "협의중": "bg-amber-100 text-amber-700 border-amber-300",
            "제안됨": "bg-slate-100 text-slate-600 border-slate-200"
        };

        const likedByList = prog.likedBy || [];
        const likeCount = likedByList.length > 0 ? likedByList.length : (prog.likes || 0);

        let likedByHtml = "";
        if (likedByList.length > 0) {
            const voterNames = likedByList.map(v => typeof v === 'string' ? v : v.name);
            const shortNames = voterNames.slice(0, 3).join(", ") + (voterNames.length > 3 ? ` 외 ${voterNames.length - 3}명` : "");
            likedByHtml = `
                <div class="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] bg-rose-50/60 -mx-4 -mb-4 px-3.5 py-1.5 rounded-b-xl">
                    <div class="flex items-center space-x-1.5 truncate text-rose-700 min-w-0" title="추천 위원: ${escapeHtml(voterNames.join(', '))}">
                        <i data-lucide="heart" class="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0"></i>
                        <span class="font-bold text-[10px] shrink-0">추천 위원:</span>
                        <span class="text-slate-800 font-semibold truncate text-[11px]">${escapeHtml(shortNames)}</span>
                    </div>
                    <button type="button" onclick="App.openLikedByModal('${escapeHtml(prog.id)}')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline shrink-0 ml-1.5 font-bold cursor-pointer">
                        명단(${likeCount}명)
                    </button>
                </div>
            `;
        } else {
            likedByHtml = `
                <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 -mx-4 -mb-4 px-3.5 py-1.5 rounded-b-xl bg-slate-50/60">
                    <span class="flex items-center space-x-1 text-slate-500">
                        <i data-lucide="heart" class="w-3 h-3 text-slate-300"></i>
                        <span>전화번호 끝 4자리로 첫 추천을 해보세요!</span>
                    </span>
                    <span class="text-[9px] text-slate-400 shrink-0">1인 1회</span>
                </div>
            `;
        }

        return `
            <div class="padlet-card p-4 flex flex-col justify-between" id="${escapeHtml(prog.id)}">
                <div>
                    <!-- 상단 넘버 배지 및 카테고리 -->
                    <div class="flex items-center justify-between gap-1.5 mb-2.5">
                        <div class="flex items-center space-x-1.5">
                            <span class="px-2 py-0.5 text-[11px] font-black bg-blue-900 text-white rounded shadow-sm">
                                ${escapeHtml(prog.code || '1-1')}
                            </span>
                            <span class="text-[11px] px-2 py-0.5 font-bold rounded border ${catBadgeColors[prog.category] || 'bg-slate-100 text-slate-700'}">
                                ${escapeHtml(prog.category)}
                            </span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusBadge[prog.status] || ''}">
                            ${escapeHtml(prog.status)}
                        </span>
                    </div>

                    <!-- 사업명 (클릭 시 상세 사업카드 팝업) -->
                    <h4 onclick="App.openProgramDetailModal('${escapeHtml(prog.id)}')" class="font-extrabold text-slate-900 text-sm leading-snug mb-2 hover:text-blue-600 cursor-pointer flex items-center justify-between group">
                        <span>${escapeHtml(prog.title)}</span>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-1"></i>
                    </h4>

                    <!-- 핵심 비전 & 목표 (첨부 양식 상단 테두리 박스 요약) -->
                    <div class="border-l-2 border-blue-600 pl-2.5 py-1 mb-2.5 bg-blue-50/60 rounded-r">
                        <p class="text-[11px] font-bold text-slate-800 line-clamp-1">
                            ◆ ${escapeHtml(prog.vision || prog.subtitle || '청년 역량강화 및 고용안정 도모')}
                        </p>
                        ${prog.targetGoal ? `
                            <p class="text-[10px] font-semibold text-blue-700 line-clamp-1 mt-0.5">
                                ◆ 목표: ${escapeHtml(prog.targetGoal)}
                            </p>
                        ` : ''}
                    </div>

                    <!-- 사업 개요 요약 -->
                    <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 space-y-1 text-[11px] text-slate-600">
                        <div class="flex items-center space-x-1.5 truncate">
                            <span class="font-bold text-slate-800 shrink-0">대상:</span>
                            <span class="truncate">${escapeHtml(prog.target || '화성 청년')}</span>
                        </div>
                        <div class="flex items-center space-x-1.5 truncate">
                            <span class="font-bold text-slate-800 shrink-0">기간:</span>
                            <span class="truncate">${escapeHtml(prog.period || prog.schedule || '2027년 중')}</span>
                        </div>
                        <div class="flex items-center space-x-1.5 truncate">
                            <span class="font-bold text-slate-800 shrink-0">위치:</span>
                            <span class="truncate">${escapeHtml(prog.location || prog.institution || '동탄 청년공간')}</span>
                        </div>
                    </div>

                    <!-- 공공 사업카드 전체보기 버튼 -->
                    <button type="button" onclick="App.openProgramDetailModal('${escapeHtml(prog.id)}')" class="w-full mb-3 py-1.5 px-2 bg-slate-900 hover:bg-blue-800 active:scale-98 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 shadow-sm transition cursor-pointer">
                        <i data-lucide="file-text" class="w-3.5 h-3.5 text-blue-300"></i>
                        <span>화성시 사업카드 양식 전체보기</span>
                    </button>

                    <div class="flex flex-wrap gap-1 mb-2">
                        ${(prog.tags || []).map(t => `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#${escapeHtml(t)}</span>`).join("")}
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium truncate max-w-[120px]">
                        ✍️ ${escapeHtml(prog.author)}
                    </span>
                    <div class="flex items-center space-x-1.5">
                        <button type="button" onclick="App.openLikeVoteModal('${escapeHtml(prog.id)}')" class="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/80 font-bold transition cursor-pointer shadow-2xs active:scale-95" title="좋아요 추천하기 (전화번호 끝 4자리 인증)">
                            <i data-lucide="heart" class="w-3.5 h-3.5 fill-rose-500"></i>
                            <span>${likeCount}</span>
                        </button>
                        <button type="button" onclick="App.openCommentModal('${escapeHtml(prog.id)}')" class="flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer" title="의견 등록">
                            <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                            <span>${(prog.comments || []).length}</span>
                        </button>
                        <button type="button" onclick="App.deleteProgramToTrash('${escapeHtml(prog.id)}')" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer" title="삭제 (휴지통 30일 보관)">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>

                <!-- 추천한 위원 명단 하단 바 -->
                ${likedByHtml}
            </div>
        `;
    },

    renderProgramReportCardHTML(prog) {
        const contactDisplay = this.isAdmin
            ? (prog.contact || "010-3351-6363")
            : (prog.contact ? "010-****-**** (관리자 인증 필요)" : "010-****-****");

        const subProgramsList = (prog.subPrograms && prog.subPrograms.length) ? prog.subPrograms : [
            { cat: "기초역량", name: prog.title + " 기초과정", desc: "이론 및 필수 실무 기초 교육" },
            { cat: "실무심화", name: prog.title + " 실무프로젝트", desc: "현업 문제 해결형 실전 프로젝트" },
            { cat: "사후연계", name: "취업 및 정책 연계", desc: "전문가 멘토링 및 관내 청년 네트워크 구축" }
        ];

        const prevList = (prog.prevPerformance && prog.prevPerformance.length) ? prog.prevPerformance : [
            "2026. 10. 동탄 청년 대상 본 사업 사전 수요조사 실시 (설문 참여자 85% 이상 필요 응답)",
            "2026. 11. 청년협의체 교육·참여·권리 분과 정기회의 의제 채택 및 세부기획안 검토"
        ];

        const planList = (prog.plan2027 && prog.plan2027.length) ? prog.plan2027 : [
            `2027. 1. ~ 2. : 사업계획 수립 및 참여 대상 청년 모집·선정`,
            `2027. 3. ~ 4. : 전문 강사진 섭외 및 교육 인프라 준비`,
            `2027. 5. ~ 10. : ${prog.title} 본 프로그램 집중 운영`,
            `2027. 11. ~ 12. : 사업 성과보고회 및 만족도 조사, 차년도 환류`
        ];

        const budgetRows = (prog.budgetTable && prog.budgetTable.length) ? prog.budgetTable : [
            { item: "◇ 사 업 비", prev: "20,000", curr: "22,000", exec: "21,000", next: "25,000" },
            { item: " - 전문 강사료 및 멘토링비", prev: "10,000", curr: "11,000", exec: "10,800", next: "12,500" },
            { item: " - 교육장 대관 및 교재비", prev: "6,000", curr: "6,500", exec: "6,200", next: "7,500" },
            { item: " - 운영비 및 행사 진행비", prev: "4,000", curr: "4,500", exec: "4,000", next: "5,000" }
        ];

        return `
            <div class="bg-white p-6 sm:p-9 rounded-xl border border-slate-300 shadow-sm max-w-3xl mx-auto text-slate-900 font-sans print:p-0 print:border-none leading-normal">
                <!-- 상단 타이틀 바: [ 1-1 ] 사업명 -->
                <div class="flex items-center space-x-3 pb-2.5 border-b-[3px] border-blue-900 mb-4">
                    <div class="bg-blue-900 text-white font-black text-lg sm:text-xl px-3.5 py-1 rounded shadow-sm shrink-0">
                        ${escapeHtml(prog.code || '1-1')}
                    </div>
                    <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex-1">
                        ${escapeHtml(prog.title)}
                    </h2>
                </div>

                <!-- 핵심 비전 & 2027년 목표 박스 (테두리 상자) -->
                <div class="border-2 border-slate-900 rounded-lg p-3.5 sm:p-4 mb-5 bg-slate-50/60 space-y-1.5">
                    <div class="flex items-start space-x-2 font-bold text-slate-950 text-xs sm:text-sm">
                        <span class="text-blue-900 shrink-0">◆</span>
                        <span>${escapeHtml(prog.vision || prog.subtitle || '청년 역량 강화 및 현장 실습을 통한 고용안정 도모')}</span>
                    </div>
                    <div class="flex items-start space-x-2 font-bold text-slate-950 text-xs sm:text-sm">
                        <span class="text-blue-900 shrink-0">◆</span>
                        <span>2027년 목표: ${escapeHtml(prog.targetGoal || '센터 상담·프로그램 참여자 수 연간 30명, 만족도 4.5점 이상')}</span>
                    </div>
                </div>

                <!-- □ 사업 개요 -->
                <div class="mb-5">
                    <div class="font-black text-slate-950 text-sm sm:text-base mb-2.5 flex items-center space-x-1.5">
                        <span class="text-slate-950 text-sm">□</span>
                        <span class="tracking-tight">사업 개요</span>
                    </div>
                    <div class="space-y-1.5 pl-1.5 text-xs sm:text-sm text-slate-800">
                        <div class="flex items-start leading-relaxed">
                            <span class="font-bold text-slate-950 shrink-0 w-24">○ 추진근거:</span>
                            <span class="flex-1">${escapeHtml(prog.basis || '「화성시 청년 기본 조례」 제21조, 「청년일자리 창출 촉진 조례」 제6조')}</span>
                        </div>
                        <div class="flex items-start leading-relaxed">
                            <span class="font-bold text-slate-950 shrink-0 w-24">○ 사업기간:</span>
                            <span class="flex-1">${escapeHtml(prog.period || prog.schedule || '2027. 1. ~ 12.')}</span>
                        </div>
                        <div class="flex items-start leading-relaxed">
                            <span class="font-bold text-slate-950 shrink-0 w-24">○ 위 &nbsp; &nbsp;치:</span>
                            <span class="flex-1">${escapeHtml(prog.location || prog.institution || '화성시 동탄 청년공간 및 관내 협력기관')}</span>
                        </div>
                        <div class="flex items-start leading-relaxed">
                            <span class="font-bold text-slate-950 shrink-0 w-24">○ 사업대상:</span>
                            <span class="flex-1">${escapeHtml(prog.target || '화성시 거주 및 활동 19세 ~ 39세 미취업·이직 희망 청년')}</span>
                        </div>
                        <div class="flex items-start leading-relaxed">
                            <span class="font-bold text-slate-950 shrink-0 w-24">○ 사업내용:</span>
                            <span class="flex-1 font-medium">${escapeHtml(prog.purpose || '')}</span>
                        </div>
                    </div>

                    <!-- 세부 프로그램 테이블 (구분 | 프로그램명 | 내용) -->
                    <div class="mt-3 overflow-x-auto">
                        <table class="w-full border-collapse border border-slate-700 text-xs">
                            <thead>
                                <tr class="bg-blue-50 text-slate-900 border-b border-slate-700">
                                    <th class="border border-slate-700 px-3 py-1.5 w-24 text-center font-bold">구분</th>
                                    <th class="border border-slate-700 px-3 py-1.5 w-48 text-center font-bold">프로그램명</th>
                                    <th class="border border-slate-700 px-3 py-1.5 text-center font-bold">내 용</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${subProgramsList.map(sub => `
                                    <tr class="hover:bg-slate-50/80">
                                        <td class="border border-slate-700 px-3 py-1.5 text-center font-semibold bg-slate-50/50">${escapeHtml(sub.cat || '과정')}</td>
                                        <td class="border border-slate-700 px-3 py-1.5 font-bold text-slate-900">${escapeHtml(sub.name || '')}</td>
                                        <td class="border border-slate-700 px-3 py-1.5 text-slate-700 leading-snug">${escapeHtml(sub.desc || '')}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-2.5 pl-1.5 text-xs sm:text-sm text-slate-800 flex items-center">
                        <span class="font-bold text-slate-950 shrink-0 w-36">○ 시행주체/시행방법:</span>
                        <span class="flex-1 font-semibold">${escapeHtml(prog.agency || '화성시 청년청소년과 / 교육·참여·권리 분과 직접사업')}</span>
                    </div>
                </div>

                <!-- < 2026년도 추진실적 > (점선 테두리 박스) -->
                <div class="mb-5">
                    <div class="text-center font-black text-xs sm:text-sm text-slate-950 mb-1.5 tracking-tight">
                        &lt; 2026년도 추진실적 &gt;
                    </div>
                    <div class="border border-dashed border-slate-500 bg-slate-50/70 rounded-lg p-3 text-xs sm:text-sm text-slate-800 space-y-1">
                        ${prevList.map(item => `
                            <div class="flex items-start space-x-1.5">
                                <span class="text-slate-900 shrink-0">▶</span>
                                <span>${escapeHtml(item)}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <!-- □ 2027년도 추진계획 -->
                <div class="mb-5">
                    <div class="font-black text-slate-950 text-sm sm:text-base mb-2 flex items-center space-x-1.5">
                        <span class="text-slate-950 text-sm">□</span>
                        <span class="tracking-tight">2027년도 추진계획</span>
                    </div>
                    <div class="space-y-1.5 pl-1.5 text-xs sm:text-sm text-slate-800">
                        ${planList.map(plan => `
                            <div class="flex items-start space-x-1.5">
                                <span class="text-slate-700 shrink-0">○</span>
                                <span>${escapeHtml(plan)}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <!-- □ 예산 현황 -->
                <div class="mb-5">
                    <div class="flex items-center justify-between mb-2">
                        <div class="font-black text-slate-950 text-sm sm:text-base flex items-center space-x-1.5">
                            <span class="text-slate-950 text-sm">□</span>
                            <span class="tracking-tight">예산 현황 : ${escapeHtml(prog.budgetRatio || '시비 100%')}</span>
                        </div>
                        <span class="text-[11px] text-slate-600 font-semibold">(단위 : 천원)</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-slate-700 text-xs">
                            <thead>
                                <tr class="bg-blue-50 text-slate-900 border-b border-slate-700">
                                    <th rowspan="2" class="border border-slate-700 px-3 py-1 text-center font-bold">구 분</th>
                                    <th colspan="3" class="border border-slate-700 px-3 py-1 text-center font-bold">2026년</th>
                                    <th class="border border-slate-700 px-3 py-1 text-center font-bold bg-blue-100/70">2027년</th>
                                </tr>
                                <tr class="bg-blue-50 text-slate-900 border-b border-slate-700 text-[11px]">
                                    <th class="border border-slate-700 px-2 py-1 text-center font-semibold">본예산</th>
                                    <th class="border border-slate-700 px-2 py-1 text-center font-semibold">최종예산</th>
                                    <th class="border border-slate-700 px-2 py-1 text-center font-semibold">집행액</th>
                                    <th class="border border-slate-700 px-2 py-1 text-center font-bold bg-blue-100/70">본예산(안)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${budgetRows.map((b, idx) => `
                                    <tr class="${idx === 0 ? 'font-bold bg-slate-100/80' : 'hover:bg-slate-50'}">
                                        <td class="border border-slate-700 px-3 py-1.5 ${idx === 0 ? 'text-left font-bold' : 'text-left pl-6 text-slate-700'}">${escapeHtml(b.item)}</td>
                                        <td class="border border-slate-700 px-2 py-1.5 text-center text-slate-700">${escapeHtml(b.prev || '-')}</td>
                                        <td class="border border-slate-700 px-2 py-1.5 text-center text-slate-700">${escapeHtml(b.curr || '-')}</td>
                                        <td class="border border-slate-700 px-2 py-1.5 text-center text-slate-700">${escapeHtml(b.exec || '-')}</td>
                                        <td class="border border-slate-700 px-2 py-1.5 text-center font-bold text-blue-900 bg-blue-50/50">${escapeHtml(b.next || '-')}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 담당부서 / 제안위원 하단 표 -->
                <table class="w-full border-collapse border border-slate-700 text-xs text-center font-medium mt-4">
                    <tr class="bg-slate-100">
                        <th class="border border-slate-700 py-2 px-3 w-1/4 font-bold text-slate-950">담당부서(팀명)</th>
                        <td class="border border-slate-700 py-2 px-3 w-1/4 text-slate-800 font-semibold">${escapeHtml(prog.department || '청년청소년과(청년일자리팀)')}</td>
                        <th class="border border-slate-700 py-2 px-3 w-1/4 font-bold text-slate-950">제안위원 / 연락처</th>
                        <td class="border border-slate-700 py-2 px-3 w-1/4 text-slate-800 font-semibold">${escapeHtml(prog.author || '김남현')} (${escapeHtml(contactDisplay)})</td>
                    </tr>
                </table>

                <!-- 위원 추천(좋아요) 현황 바 -->
                <div class="mt-4 p-3 bg-rose-50/70 border border-rose-200 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-800">
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] flex items-center space-x-1 shadow-2xs">
                            <i data-lucide="heart" class="w-3 h-3 fill-white"></i>
                            <span>추천 ${(prog.likedBy || []).length}표</span>
                        </span>
                        <span class="text-slate-700 text-xs">
                            ${(prog.likedBy && prog.likedBy.length > 0) ? `<strong>추천 위원:</strong> ${escapeHtml(prog.likedBy.map(v => typeof v === 'string' ? v : v.name).join(', '))}` : '아직 추천한 위원이 없습니다.'}
                        </span>
                    </div>
                    <button type="button" onclick="App.openLikeVoteModal('${escapeHtml(prog.id)}')" class="no-print mt-2 sm:mt-0 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-xs shadow-xs transition flex items-center space-x-1 cursor-pointer">
                        <i data-lucide="heart" class="w-3 h-3 fill-white"></i>
                        <span>추천(좋아요) 투표하기</span>
                    </button>
                </div>
            </div>
        `;
    },

    openModalForMember(memberId) {
        this.openProgramModal();
        const select = document.getElementById("program-member-select");
        if (select && memberId !== undefined && memberId !== null) {
            select.value = String(memberId);
        }
    },

    handleVote(progId) {
        this.openLikeVoteModal(progId);
    },

    openLikeVoteModal(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        if (!Array.isArray(prog.likedBy)) {
            prog.likedBy = [];
        }

        const modal = document.getElementById("like-vote-modal");
        if (!modal) return;

        document.getElementById("like-modal-prog-id").value = prog.id;
        document.getElementById("like-modal-prog-title").textContent = `[${prog.code || '1-1'}] ${prog.title}`;
        document.getElementById("like-modal-prog-author").textContent = `제안: ${prog.author || '위원'}`;

        const select = document.getElementById("like-modal-voter-select");
        select.innerHTML = '<option value="">-- 본인 위원 성함을 선택해주세요 --</option>';

        // 12명 분과위원
        const optGroupDiv = document.createElement("optgroup");
        optGroupDiv.label = "교육·참여·권리 분과 위원 (12인)";
        (this.divisionMembers || []).forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.id || m.name;
            opt.textContent = `${m.name} (${m.role || '위원'})`;
            optGroupDiv.appendChild(opt);
        });
        select.appendChild(optGroupDiv);

        // 운영위원회 위원 (연락처 등록된 경우)
        if (this.steeringMembers && this.steeringMembers.length > 0) {
            const optGroupSt = document.createElement("optgroup");
            optGroupSt.label = "운영위원회";
            this.steeringMembers.forEach(m => {
                if (m.phone && m.phone.trim()) {
                    const opt = document.createElement("option");
                    opt.value = m.id || m.name;
                    opt.textContent = `${m.name} (${m.role || '운영위원'})`;
                    optGroupSt.appendChild(opt);
                }
            });
            if (optGroupSt.children.length > 0) {
                select.appendChild(optGroupSt);
            }
        }

        // 홍보팀 위원
        if (this.prMembers && this.prMembers.length > 0) {
            const optGroupPr = document.createElement("optgroup");
            optGroupPr.label = "홍보팀";
            this.prMembers.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m.id || m.name;
                opt.textContent = `${m.name} (${m.role || '홍보팀'})`;
                optGroupPr.appendChild(opt);
            });
            select.appendChild(optGroupPr);
        }

        // 세션에 저장된 최근 투표자 자동 선택
        const lastVoterId = sessionStorage.getItem("dongtan_last_voter_id");
        if (lastVoterId && Array.from(select.options).some(o => o.value === lastVoterId)) {
            select.value = lastVoterId;
        }

        const pinInput = document.getElementById("like-modal-pin-input");
        pinInput.value = "";
        document.getElementById("like-modal-error").classList.add("hidden");
        document.getElementById("like-modal-success").classList.add("hidden");

        this.renderLikeModalVoterStatus(prog);

        select.onchange = () => {
            this.updateLikeModalButtonState(prog);
        };
        this.updateLikeModalButtonState(prog);

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        setTimeout(() => pinInput.focus(), 100);
        this.updateIcons();
    },

    updateLikeModalButtonState(prog) {
        const select = document.getElementById("like-modal-voter-select");
        const voterKey = select.value;
        const submitBtn = document.getElementById("like-modal-submit-btn");
        const submitText = document.getElementById("like-modal-submit-text");
        if (!submitBtn || !submitText) return;

        let member = (this.divisionMembers || []).find(m => m.id === voterKey || m.name === voterKey);
        if (!member) {
            member = (this.steeringMembers || []).find(m => m.id === voterKey || m.name === voterKey);
        }
        if (!member) {
            member = (this.prMembers || []).find(m => m.id === voterKey || m.name === voterKey);
        }

        const isAlreadyLiked = member && (prog.likedBy || []).some(v => v.memberId === member.id || v.name === member.name);

        if (isAlreadyLiked) {
            submitBtn.className = "flex-1 py-2.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 active:scale-98 rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer";
            submitText.textContent = "💔 추천 취소하기";
        } else {
            submitBtn.className = "flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer";
            submitText.textContent = "❤️ 좋아요 추천하기";
        }
    },

    renderLikeModalVoterStatus(prog) {
        const listEl = document.getElementById("like-modal-current-voters");
        const countEl = document.getElementById("like-modal-current-count");
        if (!listEl || !countEl) return;

        const likedByList = prog.likedBy || [];
        countEl.textContent = `${likedByList.length}명`;

        if (likedByList.length === 0) {
            listEl.innerHTML = '<span class="text-slate-400 text-xs">아직 추천한 위원이 없습니다. 첫 번째로 추천해주세요!</span>';
        } else {
            listEl.innerHTML = likedByList.map(v => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs">
                    <i data-lucide="heart" class="w-3 h-3 fill-rose-500"></i>
                    <span>${escapeHtml(v.name)}</span>
                    <span class="text-[10px] text-rose-400 font-normal">(${escapeHtml(v.role || '위원')})</span>
                </span>
            `).join("");
        }
        this.updateIcons();
    },

    handleLikeVoteSubmit(e) {
        e.preventDefault();
        const progId = document.getElementById("like-modal-prog-id").value;
        const select = document.getElementById("like-modal-voter-select");
        const voterKey = select.value;
        const pin = document.getElementById("like-modal-pin-input").value.trim();
        const errorEl = document.getElementById("like-modal-error");
        const errorMsg = document.getElementById("like-modal-error-msg");
        const successEl = document.getElementById("like-modal-success");
        const successMsg = document.getElementById("like-modal-success-msg");

        errorEl.classList.add("hidden");
        successEl.classList.add("hidden");

        if (!voterKey) {
            errorMsg.textContent = "본인의 위원 성함을 선택해주세요.";
            errorEl.classList.remove("hidden");
            return;
        }

        if (!pin || pin.length !== 4) {
            errorMsg.textContent = "비밀번호는 전화번호 끝 4자리(숫자 4자리)를 입력해야 합니다.";
            errorEl.classList.remove("hidden");
            return;
        }

        // 위원 객체 조회
        let member = (this.divisionMembers || []).find(m => m.id === voterKey || m.name === voterKey);
        if (!member) {
            member = (this.steeringMembers || []).find(m => m.id === voterKey || m.name === voterKey);
        }
        if (!member) {
            member = (this.prMembers || []).find(m => m.id === voterKey || m.name === voterKey);
        }
        if (!member) {
            errorMsg.textContent = "선택하신 위원 정보를 찾을 수 없습니다.";
            errorEl.classList.remove("hidden");
            return;
        }

        // 전화번호 끝 4자리 검증
        let phone = member.phone || "";
        if (!phone && typeof DIVISION_MEMBERS_INITIAL !== "undefined") {
            const initialMatch = DIVISION_MEMBERS_INITIAL.find(dm => dm.id === member.id || dm.name === member.name);
            if (initialMatch && initialMatch.phone) phone = initialMatch.phone;
        }

        const cleanDigits = phone.replace(/[^0-9]/g, "");
        const expectedPin = cleanDigits.slice(-4);

        if (!expectedPin || expectedPin !== pin) {
            errorMsg.textContent = "비밀번호(전화번호 끝 4자리)가 일치하지 않습니다. 다시 확인해주세요.";
            errorEl.classList.remove("hidden");
            return;
        }

        // 본인 인증 완료 -> 세션에 최근 투표자 저장
        sessionStorage.setItem("dongtan_last_voter_id", voterKey);

        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        if (!Array.isArray(prog.likedBy)) prog.likedBy = [];

        const existingIdx = prog.likedBy.findIndex(v => v.memberId === member.id || v.name === member.name);

        if (existingIdx >= 0) {
            // 이미 투표한 상태 -> 추천 취소
            prog.likedBy.splice(existingIdx, 1);
            prog.likes = prog.likedBy.length;
            this.savePrograms();
            this.renderPadletBoard();
            this.renderLikeModalVoterStatus(prog);
            this.updateLikeModalButtonState(prog);

            successMsg.textContent = `💔 ${member.name} 위원님의 추천이 정상적으로 취소되었습니다.`;
            successEl.classList.remove("hidden");
            setTimeout(() => {
                this.closeLikeVoteModal();
            }, 1000);
        } else {
            // 신규 추천 등록
            prog.likedBy.push({
                memberId: member.id,
                name: member.name,
                role: member.role || "위원",
                votedAt: new Date().toISOString()
            });
            prog.likes = prog.likedBy.length;
            this.savePrograms();
            this.renderPadletBoard();
            this.renderLikeModalVoterStatus(prog);
            this.updateLikeModalButtonState(prog);

            successMsg.textContent = `🎉 ${member.name} 위원님의 추천이 완료되었습니다! (1인 1회 투표)`;
            successEl.classList.remove("hidden");
            setTimeout(() => {
                this.closeLikeVoteModal();
            }, 1000);
        }
    },

    closeLikeVoteModal() {
        const modal = document.getElementById("like-vote-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    openLikedByModal(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        const modal = document.getElementById("liked-by-modal");
        if (!modal) return;

        document.getElementById("liked-by-modal-title").textContent = `[${prog.code || '1-1'}] ${prog.title}`;
        const listEl = document.getElementById("liked-by-modal-list");
        const countEl = document.getElementById("liked-by-modal-count");

        const likedByList = prog.likedBy || [];
        countEl.textContent = `${likedByList.length}명`;

        if (likedByList.length === 0) {
            listEl.innerHTML = `
                <div class="py-8 text-center text-slate-400">
                    <i data-lucide="heart" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                    <p class="text-sm font-bold text-slate-600">아직 추천한 위원이 없습니다.</p>
                    <p class="text-xs text-slate-400 mt-1">1번 탭의 카드 하단 [좋아요] 버튼을 눌러 추천해주세요!</p>
                </div>
            `;
        } else {
            listEl.innerHTML = likedByList.map((v, i) => {
                const timeStr = v.votedAt ? new Date(v.votedAt).toLocaleString('ko-KR', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '최근';
                return `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-rose-50/50 hover:border-rose-200 transition">
                        <div class="flex items-center space-x-3">
                            <span class="w-7 h-7 rounded-full bg-rose-100 text-rose-600 font-black text-xs flex items-center justify-center">
                                ${i + 1}
                            </span>
                            <div>
                                <div class="flex items-center space-x-1.5">
                                    <span class="font-bold text-slate-900 text-sm">${escapeHtml(v.name)}</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">${escapeHtml(v.role || '위원')}</span>
                                </div>
                                <span class="text-[11px] text-slate-400">화성시 청년정책협의체 동탄구 교육·참여·권리 분과</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="inline-flex items-center gap-1 text-[11px] text-rose-600 font-bold bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                                <i data-lucide="heart" class="w-3 h-3 fill-rose-500"></i>
                                추천 완료
                            </span>
                            <p class="text-[10px] text-slate-400 mt-0.5">${timeStr}</p>
                        </div>
                    </div>
                `;
            }).join("");
        }

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        this.updateIcons();
    },

    closeLikedByModal() {
        const modal = document.getElementById("liked-by-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    openCommentModal(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        const subTitleText = prog.subtitle ? ` (${prog.subtitle})` : "";
        const commentsSummary = (prog.comments || []).map(c => `• ${c.user}: ${c.text}`).join("\n") || "등록된 의견 없음";
        const newComment = prompt(`[${prog.title}${subTitleText}]\n\n현재 등록된 의견:\n${commentsSummary}\n\n새로운 의견이나 보완점을 작성해주세요:\n(예: 이름: 의견내용)`);
        
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
        const headers = ["사업코드", "제안위원", "분야", "사업명", "핵심비전(소제목)", "2027년목표", "추진근거", "사업기간", "위치", "사업대상", "사업내용", "시행주체", "상태", "추천수"];
        const rows = this.programs.map((p, idx) => [
            `"${(p.code || `1-${idx+1}`).replace(/"/g, '""')}"`,
            `"${(p.author || '').replace(/"/g, '""')}"`,
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.vision || p.subtitle || '').replace(/"/g, '""')}"`,
            `"${(p.targetGoal || '').replace(/"/g, '""')}"`,
            `"${(p.basis || '').replace(/"/g, '""')}"`,
            `"${(p.period || p.schedule || '').replace(/"/g, '""')}"`,
            `"${(p.location || p.institution || '').replace(/"/g, '""')}"`,
            `"${(p.target || '').replace(/"/g, '""')}"`,
            `"${(p.purpose || '').replace(/"/g, '""')}"`,
            `"${(p.agency || '').replace(/"/g, '""')}"`,
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
    // 2-1. 휴지통 (삭제된 교육 제안 30일 임시 보관함)
    // ==========================================
    deleteProgramToTrash(progId) {
        const prog = this.programs.find(p => p.id === progId);
        if (!prog) return;

        const confirmMsg = `[${prog.title}]\n\n해당 교육 제안 사업카드를 삭제하시겠습니까?\n\n• 삭제된 제안은 휴지통 탭에서 30일간 임시 보관됩니다.\n• 30일 이내 언제든지 [원클릭 복원]이 가능합니다.`;
        if (!confirm(confirmMsg)) return;

        const now = new Date();
        const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        prog.deletedAt = now.toISOString();
        prog.expiresAt = expires.toISOString();

        if (!this.trashPrograms) this.trashPrograms = [];
        this.trashPrograms.unshift(prog);
        this.programs = this.programs.filter(p => p.id !== progId);

        this.savePrograms();
        this.saveTrash();
        this.renderPadletBoard();
        if (this.currentTab === "tab-6") {
            this.renderTrashPanel();
        }

        alert(`[${prog.title}] 교육 제안이 휴지통으로 이동되었습니다.\n(휴지통 탭에서 30일간 보관 및 복원 가능)`);
    },

    restoreProgramFromTrash(progId) {
        const prog = (this.trashPrograms || []).find(p => p.id === progId);
        if (!prog) return;

        delete prog.deletedAt;
        delete prog.expiresAt;

        this.trashPrograms = this.trashPrograms.filter(p => p.id !== progId);
        this.programs.unshift(prog);

        this.savePrograms();
        this.saveTrash();
        this.renderPadletBoard();
        this.renderTrashPanel();

        alert(`[${prog.title}] 교육 프로그램이 1번 탭 패들렛 보드로 성공적으로 복원되었습니다!`);
    },

    restoreAllFromTrash() {
        if (!this.trashPrograms || !this.trashPrograms.length) {
            alert("휴지통에 보관된 항목이 없습니다.");
            return;
        }

        if (!confirm(`휴지통에 보관 중인 ${this.trashPrograms.length}개의 교육 제안을 모두 1번 탭으로 복원하시겠습니까?`)) {
            return;
        }

        this.trashPrograms.forEach(p => {
            delete p.deletedAt;
            delete p.expiresAt;
            this.programs.unshift(p);
        });

        this.trashPrograms = [];
        this.savePrograms();
        this.saveTrash();
        this.renderPadletBoard();
        this.renderTrashPanel();

        alert("휴지통의 모든 교육 제안이 1번 탭으로 복원되었습니다!");
    },

    permanentlyDeleteFromTrash(progId) {
        const prog = (this.trashPrograms || []).find(p => p.id === progId);
        if (!prog) return;

        if (!confirm(`[${prog.title}]\n\n해당 교육 제안을 완전히 영구 삭제하시겠습니까?\n(영구 삭제 시 복구할 수 없습니다)`)) {
            return;
        }

        this.trashPrograms = this.trashPrograms.filter(p => p.id !== progId);
        this.saveTrash();
        this.renderTrashPanel();
        alert("해당 교육 제안이 영구 삭제되었습니다.");
    },

    emptyTrash() {
        if (!this.trashPrograms || !this.trashPrograms.length) {
            alert("휴지통이 이미 비어 있습니다.");
            return;
        }

        if (!confirm(`휴지통을 비우시겠습니까?\n현재 보관된 ${this.trashPrograms.length}개의 교육 제안이 모두 영구 삭제되며 복구할 수 없습니다.`)) {
            return;
        }

        this.trashPrograms = [];
        this.saveTrash();
        this.renderTrashPanel();
        alert("휴지통을 완전히 비웠습니다.");
    },

    renderTrashPanel() {
        this.cleanExpiredTrash();
        const container = document.getElementById("trash-list-container");
        if (!container) return;

        const list = this.trashPrograms || [];
        this.updateTrashBadge();

        if (!list.length) {
            container.innerHTML = `
                <div class="glass-card p-12 text-center rounded-2xl border border-dashed border-slate-300">
                    <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                        <i data-lucide="trash-2" class="w-8 h-8"></i>
                    </div>
                    <h4 class="font-bold text-slate-700 text-base mb-1">휴지통이 비어 있습니다.</h4>
                    <p class="text-xs text-slate-500 mb-4">1번 탭 패들렛 보드에서 삭제한 교육 제안이 이곳에 30일간 임시 보관됩니다.</p>
                    <button type="button" onclick="App.switchTab('tab-1')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">
                        1번 탭 패들렛 보드로 이동
                    </button>
                </div>
            `;
            this.updateIcons();
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${list.map(p => {
                    const delDate = p.deletedAt ? new Date(p.deletedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "최근";
                    const diffMs = p.expiresAt ? new Date(p.expiresAt).getTime() - Date.now() : 0;
                    const remainDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    
                    return `
                        <div class="glass-card p-4 rounded-xl border border-rose-200/80 hover:border-rose-300 transition shadow-xs flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between gap-2 mb-2">
                                    <div class="flex items-center space-x-1.5">
                                        <span class="px-2 py-0.5 text-[10px] font-black bg-slate-800 text-white rounded">
                                            ${escapeHtml(p.code || '1-1')}
                                        </span>
                                        <span class="text-[10px] px-2 py-0.5 font-bold rounded bg-slate-100 text-slate-700 border">
                                            ${escapeHtml(p.category || '교육')}
                                        </span>
                                    </div>
                                    <span class="text-[10px] px-2 py-0.5 font-black rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                        <i data-lucide="clock" class="w-3 h-3 text-rose-600"></i>
                                        D-${remainDays}일 보관
                                    </span>
                                </div>

                                <h4 class="font-bold text-slate-900 text-sm mb-1.5 leading-snug line-clamp-2">
                                    ${escapeHtml(p.title)}
                                </h4>
                                <p class="text-xs text-slate-600 line-clamp-2 mb-2.5 bg-slate-50 p-2 rounded border border-slate-100">
                                    ${escapeHtml(p.purpose || p.subtitle || '')}
                                </p>

                                <div class="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2 mb-3">
                                    <div>제안위원: <strong class="text-slate-700">${escapeHtml(p.author || '제안위원')}</strong></div>
                                    <div>삭제일시: ${delDate}</div>
                                </div>
                            </div>

                            <div class="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-1.5">
                                <button type="button" onclick="App.restoreProgramFromTrash('${escapeHtml(p.id)}')" class="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer shadow-xs">
                                    <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                                    <span>원클릭 복원</span>
                                </button>
                                <button type="button" onclick="App.permanentlyDeleteFromTrash('${escapeHtml(p.id)}')" class="py-1.5 px-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer" title="영구 삭제">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-500"></i>
                                    <span>영구삭제</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
        this.updateIcons();
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

        // 진행률 게이지 바 및 텍스트 갱신 (P2 인터랙션 보완)
        const progressPercentages = [0, 20, 40, 60, 80, 100];
        const percent = progressPercentages[stepNumber] || 20;
        const progressBar = document.getElementById("ideation-progress-bar");
        const progressText = document.getElementById("ideation-progress-percent");
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) {
            progressText.textContent = `${percent}% 진행 중 (Step ${stepNumber}/5)`;
            if (percent === 100) {
                progressText.className = "font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200";
            } else {
                progressText.className = "font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200";
            }
        }

        for (let i = 1; i <= 5; i++) {
            const stepBtn = document.getElementById(`step-indicator-${i}`);
            const line = document.getElementById(`step-line-${i}`);
            if (stepBtn) {
                if (i === stepNumber) {
                    stepBtn.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-blue-600 text-white shadow-lg ring-4 ring-blue-100 transition-all";
                    stepBtn.innerHTML = `<span>${i}</span>`;
                } else if (i < stepNumber) {
                    stepBtn.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-500 text-white shadow-xs transition-all";
                    stepBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i>`;
                } else {
                    stepBtn.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-100 text-slate-400 border border-slate-200 transition-all";
                    stepBtn.innerHTML = `<span>${i}</span>`;
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
            this.animateSurveyBars();
            if (this.surveyChartViewMode === "chart") {
                setTimeout(() => this.renderSurveyChart(), 100);
            }
        } else if (stepNumber === 3) {
            this.renderMcpPolicyList();
        } else if (stepNumber === 5) {
            this.renderProposalSelector();
            this.loadProposal(this.selectedProposalIndex);
        }

        document.getElementById("tab-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
        this.updateIcons();
    },

    toggleSurveyChartView(mode) {
        this.surveyChartViewMode = mode;
        const visualContainer = document.getElementById("survey-visual-container");
        const chartContainer = document.getElementById("survey-chart-container");
        const visualBtn = document.getElementById("survey-view-visual-btn");
        const chartBtn = document.getElementById("survey-view-chart-btn");

        if (mode === "visual") {
            if (visualContainer) visualContainer.classList.remove("hidden");
            if (chartContainer) chartContainer.classList.add("hidden");
            if (visualBtn) {
                visualBtn.className = "px-2 py-0.5 rounded-md font-bold transition bg-white text-blue-700 shadow-2xs cursor-pointer";
            }
            if (chartBtn) {
                chartBtn.className = "px-2 py-0.5 rounded-md font-bold transition text-slate-500 hover:text-slate-800 cursor-pointer";
            }
            this.animateSurveyBars();
        } else {
            if (visualContainer) visualContainer.classList.add("hidden");
            if (chartContainer) chartContainer.classList.remove("hidden");
            if (chartBtn) {
                chartBtn.className = "px-2 py-0.5 rounded-md font-bold transition bg-white text-blue-700 shadow-2xs cursor-pointer";
            }
            if (visualBtn) {
                visualBtn.className = "px-2 py-0.5 rounded-md font-bold transition text-slate-500 hover:text-slate-800 cursor-pointer";
            }
            setTimeout(() => this.renderSurveyChart(), 50);
        }
    },

    animateSurveyBars() {
        const bars = [
            { id: "survey-bar-1", width: "45.7%" },
            { id: "survey-bar-2", width: "33.5%" },
            { id: "survey-bar-3", width: "14.1%" },
            { id: "survey-bar-4", width: "4.2%" },
            { id: "survey-bar-5", width: "2.5%" }
        ];
        bars.forEach(b => {
            const el = document.getElementById(b.id);
            if (el) el.style.width = "0%";
        });
        setTimeout(() => {
            bars.forEach(b => {
                const el = document.getElementById(b.id);
                if (el) el.style.width = b.width;
            });
        }, 50);
    },

    renderSurveyChart() {
        const canvas = document.getElementById("surveyChart");
        if (!canvas) return;

        if (typeof Chart === "undefined") {
            console.warn("Chart.js 라이브러리가 로드되지 않아 비주얼 인포그래픽 뷰로 전환합니다.");
            this.toggleSurveyChartView("visual");
            return;
        }

        try {
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
                            "rgba(16, 185, 129, 0.85)",
                            "rgba(245, 158, 11, 0.85)",
                            "rgba(239, 68, 68, 0.85)"
                        ],
                        borderRadius: 6,
                        borderWidth: 0
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    },
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
                            max: 50,
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
        } catch (err) {
            console.warn("Chart.js 렌더링 오류:", err);
            this.toggleSurveyChartView("visual");
        }
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
                    </div>

                    <!-- 성명 -->
                    <div class="mt-1 mb-2">
                        <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">성명</label>
                        <p class="text-sm font-black text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded">${escapeHtml(m.name)}</p>
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

                <div class="pt-2 border-t border-slate-200/80">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[10px] font-semibold text-slate-500">연락처 및 이메일</label>
                        ${this.isAdmin ? `
                            <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">관리자 인증</span>
                        ` : `
                            <span class="text-[9px] font-medium text-slate-400">비공개</span>
                        `}
                    </div>
                    ${this.isAdmin ? `
                        <div class="space-y-1">
                            <div class="flex items-center space-x-1.5 px-2 py-1 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-emerald-900 text-xs font-bold font-mono">
                                <i data-lucide="phone-call" class="w-3 h-3 text-emerald-600 shrink-0"></i>
                                <span>${escapeHtml(m.phone || '연락처 미등록')}</span>
                            </div>
                            <div class="flex items-center space-x-1.5 px-2 py-1 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-emerald-900 text-xs font-mono">
                                <i data-lucide="mail" class="w-3 h-3 text-emerald-600 shrink-0"></i>
                                <span>${escapeHtml(m.email || '이메일 미등록')}</span>
                            </div>
                        </div>
                    ` : `
                        <div class="flex items-center space-x-1.5 px-2 py-1.5 bg-slate-100/80 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-mono">
                            <i data-lucide="lock" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                            <span>비공개</span>
                        </div>
                    `}
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
                const inCharge = (item.inChargeRole || "").toLowerCase();
                return (
                    item.title.toLowerCase().includes(search) ||
                    item.summary.toLowerCase().includes(search) ||
                    item.category.toLowerCase().includes(search) ||
                    item.bylawsRef.toLowerCase().includes(search) ||
                    inCharge.includes(search) ||
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
        const inCharge = item.inChargeRole === "분과장" ? "분과장" : "운영위원회 담당";
        const isDivision = inCharge === "분과장";

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

                <!-- 담당 배지 (운영위원회 담당 / 분과장) -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div class="flex items-center space-x-1.5 min-w-0">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">담당:</span>
                        <div class="px-2.5 py-1 rounded-lg ${isDivision ? 'bg-amber-50 border border-amber-200 text-amber-900 font-extrabold' : 'bg-blue-50 border border-blue-200 text-blue-900 font-extrabold'} flex items-center space-x-1.5 truncate shadow-xs">
                            <i data-lucide="${isDivision ? 'user-check' : 'users'}" class="w-3.5 h-3.5 ${isDivision ? 'text-amber-600' : 'text-blue-600'} shrink-0"></i>
                            <span class="truncate">${escapeHtml(inCharge)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 5번 탭 상단 서브 탭 전환 (운영위원회 / 분과 위원 / 홍보팀 명단 관리)
    // ==========================================
    switchTab5Sub(subTab) {
        this.tab5Sub = subTab;

        const steeringBtn = document.getElementById("tab5-sub-steering-btn");
        const divisionBtn = document.getElementById("tab5-sub-division-btn");
        const prBtn = document.getElementById("tab5-sub-pr-btn");

        const steeringPanel = document.getElementById("tab5-panel-steering");
        const divisionPanel = document.getElementById("tab5-panel-division");
        const prPanel = document.getElementById("tab5-panel-pr");

        // 초기화: 모든 버튼 비활성 스타일 적용
        const inactiveBtnClass = "px-5 sm:px-6 py-3.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-b-2 border-transparent flex items-center gap-2 transition";
        if (steeringBtn) steeringBtn.className = inactiveBtnClass;
        if (divisionBtn) divisionBtn.className = inactiveBtnClass;
        if (prBtn) prBtn.className = inactiveBtnClass;

        if (steeringPanel) steeringPanel.classList.add("hidden");
        if (divisionPanel) divisionPanel.classList.add("hidden");
        if (prPanel) prPanel.classList.add("hidden");

        if (subTab === "steering") {
            if (steeringBtn) {
                steeringBtn.className = "px-5 sm:px-6 py-3.5 text-sm font-bold text-white bg-blue-600 border-b-2 border-blue-600 flex items-center gap-2 transition shadow-xs";
            }
            if (steeringPanel) steeringPanel.classList.remove("hidden");
            this.renderSteeringMembersGrid();
        } else if (subTab === "pr") {
            if (prBtn) {
                prBtn.className = "px-5 sm:px-6 py-3.5 text-sm font-bold text-white bg-rose-600 border-b-2 border-rose-600 flex items-center gap-2 transition shadow-xs";
            }
            if (prPanel) prPanel.classList.remove("hidden");
            this.renderPrMembersGrid();
        } else {
            // 기본값: division (분과 위원 명단 관리)
            if (divisionBtn) {
                divisionBtn.className = "px-5 sm:px-6 py-3.5 text-sm font-bold text-white bg-violet-600 border-b-2 border-violet-600 flex items-center gap-2 transition shadow-xs";
            }
            if (divisionPanel) divisionPanel.classList.remove("hidden");
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
                    </div>

                    <!-- 성명 -->
                    <div class="mt-1 mb-2">
                        <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">성명</label>
                        <p class="text-sm font-black text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded">${escapeHtml(m.name)}</p>
                    </div>

                    <!-- 연락처 (관리자 인증 시에만 표기) -->
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
                            <div class="flex items-center space-x-1.5 px-2 py-1.5 bg-slate-100/80 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-mono">
                                <i data-lucide="lock" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                <span>비공개</span>
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
        const totalPr = this.prMembers ? this.prMembers.length : 0;
        const navMembersBadge = document.getElementById("nav-members-count-badge");
        if (navMembersBadge) navMembersBadge.textContent = `총 ${total + totalSteering + totalPr}인`;
    },

    // ==========================================
    // 홍보팀 명단 그리드 렌더링 (3번째 명단 관리)
    // - 홍보팀장: 김나연 분과장
    // - 팀원: 유연주 병점구 위원
    // ==========================================
    renderPrMembersGrid() {
        const grid = document.getElementById("pr-members-grid");
        if (!grid) return;

        if (!this.prMembers || !this.prMembers.length) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 text-sm">등록된 홍보팀 위원이 없습니다.</div>`;
            return;
        }

        grid.innerHTML = this.prMembers.map(m => `
            <div class="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-rose-400 transition-all shadow-xs flex flex-col justify-between" id="pr-card-${escapeHtml(m.id)}">
                <div>
                    <!-- 직책 및 권역 배지 -->
                    <div class="flex items-center justify-between mb-2.5">
                        <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${m.role === '홍보팀장' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
                            ${m.role === '홍보팀장' ? '⭐ ' : '📢 '}${escapeHtml(m.role)}
                        </span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                            ${escapeHtml(m.district || '병점구')}
                        </span>
                    </div>

                    <!-- 성명 및 직위 -->
                    <div class="mt-1 mb-2.5">
                        <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">성명</label>
                        <div class="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl">
                            <span class="text-base font-black text-slate-900">${escapeHtml(m.name)}</span>
                            <span class="text-[11px] font-bold text-slate-500">${escapeHtml(m.position || '')}</span>
                        </div>
                    </div>

                    <!-- 주요 역할 및 전담 과업 -->
                    <div class="mb-3">
                        <label class="block text-[10px] font-semibold text-slate-500 mb-1">전담 업무 및 역할</label>
                        <p class="text-xs text-slate-700 bg-white/70 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed min-h-[48px]">
                            ${escapeHtml(m.duties || '청년 소통 및 미디어 콘텐츠 기획·제작 지원')}
                        </p>
                    </div>

                    <!-- 연락처 (관리자 인증 시에만 표기) -->
                    <div class="mt-2 pt-2.5 border-t border-slate-200/80">
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
                                <span>${escapeHtml(m.phone || '연락처 미등록 (관리자 등록 가능)')}</span>
                            </div>
                        ` : `
                            <div class="flex items-center space-x-1.5 px-2 py-1.5 bg-slate-100/80 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-mono">
                                <i data-lucide="lock" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                <span>비공개</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `).join("");

        this.updatePrCounts();
        this.updateIcons();
    },

    // 홍보팀 인원수 갱신
    updatePrCounts() {
        const totalPr = this.prMembers ? this.prMembers.length : 0;
        const el = document.getElementById("pr-header-count");
        if (el) el.textContent = `(총 ${totalPr}인)`;

        const badge = document.getElementById("tab5-pr-badge");
        if (badge) badge.textContent = totalPr;

        const totalSteering = this.steeringMembers ? this.steeringMembers.length : 0;
        const totalDiv = this.divisionMembers ? this.divisionMembers.length : 0;
        const navMembersBadge = document.getElementById("nav-members-count-badge");
        if (navMembersBadge) navMembersBadge.textContent = `총 ${totalSteering + totalDiv + totalPr}인`;
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

    // ==========================================
    // 플랫폼 전체 관리자 보안 인증
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
                this.renderSteeringMembersGrid();
                this.renderDivisionMembersGrid();
                this.renderPrMembersGrid();
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
            this.renderSteeringMembersGrid();
            this.renderDivisionMembersGrid();
            this.renderPrMembersGrid();
            alert("✅ 관리자 권한이 정상 승인되었습니다.\n위원 연락처가 즉시 공개 표기됩니다.");
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

    // 3번 탭 (회칙 정리) 보안 인증 모달 제어
    openBylawsAuthModal() {
        const modal = document.getElementById("bylaws-auth-modal");
        const input = document.getElementById("bylaws-password-input");
        const errorMsg = document.getElementById("bylaws-auth-error-msg");
        if (errorMsg) errorMsg.classList.add("hidden");
        if (input) input.value = "";
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            setTimeout(() => {
                if (input) input.focus();
            }, 100);
        }
        this.updateIcons();
    },

    closeBylawsAuthModal() {
        const modal = document.getElementById("bylaws-auth-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    submitBylawsAuth(e) {
        if (e) e.preventDefault();
        const input = document.getElementById("bylaws-password-input");
        const errorMsg = document.getElementById("bylaws-auth-error-msg");
        const pwd = (input ? input.value : "").trim();

        if (pwd === "1123") {
            this.isBylawsAuthenticated = true;
            sessionStorage.setItem("dongtan_bylaws_auth", "true");
            this.closeBylawsAuthModal();
            this.updateBylawsAuthUI();
            this.switchTab("tab-3");
            alert("✅ 3번 탭(회칙 정리) 열람 권한이 정상 승인되었습니다.");
        } else {
            if (errorMsg) errorMsg.classList.remove("hidden");
            if (input) {
                input.value = "";
                input.focus();
            }
        }
    },

    lockBylaws() {
        this.isBylawsAuthenticated = false;
        sessionStorage.removeItem("dongtan_bylaws_auth");
        this.updateBylawsAuthUI();
        this.switchTab("tab-1");
        alert("🔒 3번 탭(회칙 정리)이 다시 잠금(비활성화) 처리되었습니다.");
    },

    updateBylawsAuthUI() {
        const badge = document.getElementById("tab3-lock-badge");
        if (badge) {
            if (this.isBylawsAuthenticated) {
                badge.className = "ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0 flex items-center gap-0.5";
                badge.innerHTML = '<i data-lucide="unlock" class="w-2.5 h-2.5"></i><span>승인됨</span>';
            } else {
                badge.className = "ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold shrink-0 flex items-center gap-0.5";
                badge.innerHTML = '<i data-lucide="lock" class="w-2.5 h-2.5"></i><span>비활성</span>';
            }
        }
        this.updateIcons();
    },

    // ==========================================
    // [P0 긴급] 데이터 클라우드 동기화 & 실시간 협업 허브
    // ==========================================
    openCloudSyncModal() {
        const modal = document.getElementById("cloud-sync-modal");
        const urlInput = document.getElementById("cloud-api-url-input");
        if (urlInput) {
            urlInput.value = localStorage.getItem("dongtan_cloud_api_url") || "";
        }
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }
        this.switchSyncTab("code");
        this.updateIcons();
    },

    closeCloudSyncModal() {
        const modal = document.getElementById("cloud-sync-modal");
        if (modal) {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
    },

    switchSyncTab(tab) {
        const panels = {
            code: document.getElementById("sync-panel-code"),
            file: document.getElementById("sync-panel-file"),
            cloud: document.getElementById("sync-panel-cloud")
        };
        const btns = {
            code: document.getElementById("sync-tab-code-btn"),
            file: document.getElementById("sync-tab-file-btn"),
            cloud: document.getElementById("sync-tab-cloud-btn")
        };

        const activeClass = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-blue-600 shadow-2xs transition flex items-center justify-center gap-1";
        const inactiveClass = "flex-1 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition flex items-center justify-center gap-1";

        Object.keys(panels).forEach(key => {
            if (panels[key]) {
                if (key === tab) {
                    panels[key].classList.remove("hidden");
                } else {
                    panels[key].classList.add("hidden");
                }
            }
            if (btns[key]) {
                btns[key].className = key === tab ? activeClass : inactiveClass;
            }
        });
        this.updateIcons();
    },

    // 1. 간편 동기화 코드 생성 및 클립보드 복사
    generateAndCopySyncCode() {
        try {
            const payload = {
                app: "dongtan-youth-platform",
                version: "2026.10",
                exportedAt: new Date().toISOString(),
                programs: this.programs || [],
                divisionMembers: this.divisionMembers || [],
                prMembers: this.prMembers || []
            };

            const jsonStr = JSON.stringify(payload);
            const encoded = btoa(unescape(encodeURIComponent(jsonStr)));

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(encoded).then(() => {
                    const status = document.getElementById("sync-code-copy-status");
                    if (status) {
                        status.classList.remove("hidden");
                        setTimeout(() => status.classList.add("hidden"), 3000);
                    }
                    this.showToast("동기화 코드가 클립보드에 복사되었습니다. 단체 카톡방에 붙여넣기하세요!", "success");
                }).catch(() => {
                    this.fallbackCopyText(encoded);
                });
            } else {
                this.fallbackCopyText(encoded);
            }
        } catch(e) {
            console.error("동기화 코드 생성 실패:", e);
            this.showToast("동기화 코드 생성 중 오류가 발생했습니다.", "error");
        }
    },

    fallbackCopyText(text) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
            this.showToast("동기화 코드가 복사되었습니다! 카톡에 붙여넣기하세요.", "success");
        } catch(err) {
            prompt("아래 코드를 복사해주세요 (Ctrl+C):", text);
        }
        document.body.removeChild(ta);
    },

    // 2. 전달받은 동기화 코드 입력 및 데이터 병합
    applySyncCode() {
        const input = document.getElementById("sync-code-input");
        if (!input) return;
        const raw = input.value.trim();

        if (!raw) {
            this.showToast("공유받은 동기화 코드를 붙여넣어주세요.", "warning");
            input.focus();
            return;
        }

        try {
            const jsonStr = decodeURIComponent(escape(atob(raw)));
            const data = JSON.parse(jsonStr);

            if (!data || !Array.isArray(data.programs)) {
                throw new Error("유효하지 않은 데이터 구조입니다.");
            }

            const mergedCount = this.mergeSyncedPayload(data);
            input.value = "";
            this.showToast(`데이터 병합 완료! (${mergedCount.added}건 신규 추가, ${mergedCount.updated}건 업데이트)`, "success");
            this.closeCloudSyncModal();
        } catch(e) {
            console.error("코드 병합 실패:", e);
            this.showToast("올바른 동기화 코드가 아닙니다. 코드를 다시 확인해주세요.", "error");
        }
    },

    // 3. 스마트 병합 엔진 (중복 방지 & 안전 업데이트)
    mergeSyncedPayload(data) {
        let added = 0;
        let updated = 0;

        if (Array.isArray(data.programs)) {
            data.programs.forEach(newP => {
                const idx = this.programs.findIndex(p => p.id === newP.id || (p.title === newP.title && p.author === newP.author));
                if (idx === -1) {
                    this.programs.unshift(newP);
                    added++;
                } else {
                    // 추천 위원 명단(likedBy) 병합
                    const currentLikedBy = Array.isArray(this.programs[idx].likedBy) ? this.programs[idx].likedBy : [];
                    const incomingLikedBy = Array.isArray(newP.likedBy) ? newP.likedBy : [];
                    incomingLikedBy.forEach(voter => {
                        const vKey = typeof voter === 'string' ? voter : (voter.memberId || voter.name);
                        const exists = currentLikedBy.some(cv => (typeof cv === 'string' ? cv : (cv.memberId || cv.name)) === vKey);
                        if (!exists) currentLikedBy.push(voter);
                    });
                    this.programs[idx].likedBy = currentLikedBy;
                    this.programs[idx].likes = currentLikedBy.length;
                    updated++;
                }
            });
            this.savePrograms();
        }

        // 분과위원 및 홍보팀 명단 보존
        if (Array.isArray(data.divisionMembers) && data.divisionMembers.length > 0) {
            data.divisionMembers.forEach(dm => {
                if (!this.divisionMembers.some(m => m.id === dm.id || m.name === dm.name)) {
                    this.divisionMembers.push(dm);
                }
            });
            this.saveDivisionMembers();
        }

        if (Array.isArray(data.prMembers) && data.prMembers.length > 0) {
            data.prMembers.forEach(pm => {
                if (!this.prMembers.some(m => m.id === pm.id || m.name === pm.name)) {
                    this.prMembers.push(pm);
                }
            });
            this.savePrMembers();
        }

        this.renderAll();
        return { added, updated };
    },

    // 4. 전체 백업 파일 다운로드
    downloadFullBackupJson() {
        const payload = {
            app: "dongtan-youth-platform",
            version: "2026.10",
            exportedAt: new Date().toISOString(),
            programs: this.programs,
            divisionMembers: this.divisionMembers,
            prMembers: this.prMembers,
            steeringMembers: this.steeringMembers
        };

        const str = JSON.stringify(payload, null, 2);
        const blob = new Blob([str], { type: "application/json;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        a.href = url;
        a.download = `동탄청년플랫폼_전체백업_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast("전체 데이터 백업 JSON 파일이 성공적으로 다운로드되었습니다.", "info");
    },

    // 5. 백업 파일 업로드 및 병합
    uploadBackupJson() {
        const fileInput = document.getElementById("sync-file-input");
        if (!fileInput || !fileInput.files.length) {
            this.showToast("불러올 JSON 파일을 먼저 선택해주세요.", "warning");
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const res = this.mergeSyncedPayload(data);
                this.showToast(`JSON 파일 병합 성공! (${res.added}건 추가, ${res.updated}건 갱신)`, "success");
                fileInput.value = "";
                this.closeCloudSyncModal();
            } catch(err) {
                console.error("파일 파싱 실패:", err);
                this.showToast("JSON 파일 형식이 올바르지 않습니다.", "error");
            }
        };
        reader.readAsText(file, "UTF-8");
    },

    // 6. 클라우드 Google Sheets / REST API 연동
    saveCloudApiUrl() {
        const input = document.getElementById("cloud-api-url-input");
        if (!input) return;
        const url = input.value.trim();
        localStorage.setItem("dongtan_cloud_api_url", url);
        this.showToast("클라우드 연동 URL이 안전하게 저장되었습니다.", "success");
    },

    pushToCloudApi() {
        const url = localStorage.getItem("dongtan_cloud_api_url") || (document.getElementById("cloud-api-url-input") ? document.getElementById("cloud-api-url-input").value.trim() : "");
        if (!url) {
            this.showToast("먼저 Google Apps Script 또는 REST API URL을 입력해주세요.", "warning");
            return;
        }

        const payload = {
            action: "push",
            timestamp: new Date().toISOString(),
            programs: this.programs,
            divisionMembers: this.divisionMembers,
            prMembers: this.prMembers
        };

        this.showToast("구글 스프레드시트로 데이터를 전송 중입니다...", "info");

        fetch(url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(() => {
            this.showToast("✅ 구글 스프레드시트로 최신 데이터가 성공적으로 전송되었습니다!", "success");
        }).catch((err) => {
            console.error("Cloud push failed:", err);
            this.showToast("클라우드 전송에 실패했습니다. URL을 확인해주세요.", "error");
        });
    },

    pullFromCloudApi() {
        const url = localStorage.getItem("dongtan_cloud_api_url") || (document.getElementById("cloud-api-url-input") ? document.getElementById("cloud-api-url-input").value.trim() : "");
        if (!url) {
            this.showToast("먼저 Google Apps Script 또는 REST API URL을 입력해주세요.", "warning");
            return;
        }

        this.showToast("구글 시트에서 최신 데이터를 가져오는 중입니다...", "info");

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data.programs)) {
                    const res = this.mergeSyncedPayload(data);
                    this.showToast(`구글 시트 동기화 완료! (${res.added}건 추가, ${res.updated}건 업데이트)`, "success");
                    this.closeCloudSyncModal();
                } else {
                    this.showToast("구글 시트 응답 데이터가 비어있거나 형식이 다릅니다.", "warning");
                }
            })
            .catch(err => {
                console.error("Cloud pull failed:", err);
                this.showToast("구글 시트에서 데이터를 불러오지 못했습니다. URL과 배포 권한(모든 사용자)을 확인하세요.", "error");
            });
    },

    copyGoogleScriptCode() {
        const scriptCode = `// [화성시 청년정책협의체 Google Apps Script 실시간 연동 코드]
// 구글 스프레드시트 > 확장 프로그램 > Apps Script에 아래 코드를 붙여넣고 [배포 > 웹 앱으로 배포]하세요.
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getRange("A1").getValue();
  return ContentService.createTextOutput(data || "{}").setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange("A1").setValue(e.postData.contents);
  return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(scriptCode).then(() => {
                this.showToast("Google Apps Script 템플릿 코드가 클립보드에 복사되었습니다!", "success");
            });
        }
    },

    renderAll() {
        this.renderPadletBoard();
        this.renderMcpPolicyList();
        this.renderProposalSelector();
        this.renderUploadedFilesList();
        this.renderSteeringMembersGrid();
        this.renderDivisionMembersGrid();
        this.renderPrMembersGrid();
        this.renderCouncilFlow();
        this.updateTrashBadge();
        this.animateSurveyBars();
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        App.init();
    });
} else {
    App.init();
}
