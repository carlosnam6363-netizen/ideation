import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Step 3:
# Show the "Next Step" button at the very top of Step 3 to reduce fatigue,
# provide clear concise guidance, and make the detailed 2,934 list collapsible/expandable.

new_step_3 = '''                <!-- ---------------------------------------------------------- -->
                <!-- STEP 3: 관련 정책들 MCP(정책연계) 진행 (첨부 데이터 기반) -->
                <!-- ---------------------------------------------------------- -->
                <div id="ideation-step-3" class="step-panel hidden space-y-6">
                    <div class="glass-card p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
                        <!-- 상단 헤더 -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                            <div>
                                <span class="text-xs font-bold text-blue-600 tracking-wider uppercase">STEP 03. 온통청년 MCP 정책 연계 가이드</span>
                                <h3 class="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                                    온통청년 2,934건 데이터 기반 관련 정책 연계(MCP) 안내
                                </h3>
                                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                                    선택하신 전문 분야에 맞는 중앙·지자체 청년정책 벤치마킹 데이터가 자동으로 연계되었습니다.
                                </p>
                            </div>
                            <div id="mcp-selected-track-badge" class="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold whitespace-nowrap">
                                선택된 전문 분야: 디지털·AI 미래교육
                            </div>
                        </div>

                        <!-- ★ 최상단 다음 단계 바로 이동 배너 (피로감 해소) ★ -->
                        <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
                                    <i data-lucide="zap" class="w-5 h-5 text-amber-300"></i>
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-sm sm:text-base">MCP 정책 연계 준비 완료! 바로 다음 단계로 이동하시겠습니까?</h4>
                                    <p class="text-xs text-blue-100">긴 정책 목록을 일일이 읽지 않고도, 다음 단계에서 화성특례시 핵심 벤치마킹과 5대 추천 제안서를 바로 확인하실 수 있습니다.</p>
                                </div>
                            </div>
                            <button onclick="App.goToStep(4)" class="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 shrink-0 transition transform hover:-translate-y-0.5">
                                <span>다음 단계로 바로 이동 (4단계 벤치마킹)</span>
                                <i data-lucide="arrow-right" class="w-4 h-4"></i>
                            </button>
                        </div>

                        <!-- 3단계 핵심 안내 요약 카드 -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span class="text-xs font-bold text-blue-600 block mb-1">🔗 연계 데이터베이스</span>
                                <h5 class="font-bold text-slate-900 text-sm mb-1">온통청년 2,934건 공공 데이터</h5>
                                <p class="text-xs text-slate-600">일자리(1,134건), 복지·문화(688건), 참여·권리(420건), 교육(375건), 주거(316건) 전수 분석</p>
                            </div>
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span class="text-xs font-bold text-emerald-600 block mb-1">🎯 동탄구 분과 타깃</span>
                                <h5 class="font-bold text-slate-900 text-sm mb-1">교육 · 참여 · 권리 3대 집중</h5>
                                <p class="text-xs text-slate-600">K-디지털 트레이닝, 청년참여자율예산, 청년근로권익센터, 전월세안심계약 매니저 등 핵심 연계</p>
                            </div>
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span class="text-xs font-bold text-purple-600 block mb-1">💡 정책 제안 접목점</span>
                                <h5 class="font-bold text-slate-900 text-sm mb-1">화성특례시 조례 & 예산 맞춤화</h5>
                                <p class="text-xs text-slate-600">중앙정부 국비 매칭 방안 및 화성시 청년활동포인트제와 융합하여 5단계 정책제안서에 자동 반영</p>
                            </div>
                        </div>

                        <!-- 온통청년 세부 정책 목록 (접이식 아코디언으로 피로감 완화) -->
                        <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <button onclick="App.toggleMcpListDetails()" id="mcp-details-toggle-btn" class="w-full text-left p-4 sm:p-5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between font-bold text-slate-800 text-xs sm:text-sm transition">
                                <div class="flex items-center space-x-2">
                                    <i data-lucide="list-filter" class="w-4 h-4 text-blue-600"></i>
                                    <span>온통청년 세부 연계 정책 검색 및 열람하기 (선택 사항)</span>
                                </div>
                                <div class="flex items-center space-x-2 text-xs text-slate-500">
                                    <span id="mcp-toggle-text">상세 정책 목록 열기</span>
                                    <i data-lucide="chevron-down" id="mcp-toggle-icon" class="w-4 h-4 transition-transform"></i>
                                </div>
                            </button>

                            <div id="mcp-details-content" class="hidden p-5 border-t border-slate-200 space-y-4">
                                <!-- 검색 및 필터 툴바 -->
                                <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                    <!-- 분야 탭 -->
                                    <div class="flex items-center space-x-1 overflow-x-auto w-full md:w-auto">
                                        <button data-cat="all" class="mcp-cat-filter px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white">전체</button>
                                        <button data-cat="참여, 권리" class="mcp-cat-filter px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">참여·권리</button>
                                        <button data-cat="교육" class="mcp-cat-filter px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">교육</button>
                                        <button data-cat="일자리" class="mcp-cat-filter px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">일자리</button>
                                        <button data-cat="금융, 복지, 문화" class="mcp-cat-filter px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">복지·문화</button>
                                        <button data-cat="주거" class="mcp-cat-filter px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">주거</button>
                                    </div>

                                    <!-- 검색창 -->
                                    <div class="relative w-full md:w-72">
                                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
                                        <input id="mcp-search-input" type="text" placeholder="정책명, 주관기관, 지역, 내용 검색..." class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>

                                <!-- MCP 정책 카드 그리드 -->
                                <div id="mcp-policy-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                    <!-- Injected via JS -->
                                </div>
                            </div>
                        </div>

                        <!-- 하단 네비게이션 -->
                        <div class="pt-4 border-t border-slate-200 flex items-center justify-between">
                            <button onclick="App.goToStep(2)" class="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm flex items-center space-x-2 transition">
                                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                                <span>이전 단계</span>
                            </button>
                            <button onclick="App.goToStep(4)" class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center space-x-2 transition">
                                <span>다음 단계: 화성시 및 청년친화도시 정책 벤치마킹</span>
                                <i data-lucide="arrow-right" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>'''

# 2. Update Step 5:
# Match the exact official proposal template table:
# [제5기 화성시 청년정책협의체 정책 제안서]
# Table rows:
# - 분과명
# - 제안명
# - 추진근거
# - 참고정책
# - 제안배경 및 필요성:
#   - 현황과 문제점
#   - 개선방안
# - 제안내용
# - 기대효과
# Plus HWP and DOCX export buttons!

new_step_5 = '''                <!-- ---------------------------------------------------------- -->
                <!-- STEP 5: 정책 제안서 공식 서식 작성 & HWP/DOCX 파일 추출 -->
                <!-- ---------------------------------------------------------- -->
                <div id="ideation-step-5" class="step-panel hidden space-y-6">
                    <div class="glass-card p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
                        <!-- 헤더 및 파일 추출 툴바 -->
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                            <div>
                                <span class="text-xs font-bold text-blue-600 tracking-wider uppercase">STEP 05. 공식 서식 작성 및 문서 추출</span>
                                <h3 class="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                                    화성시 청년정책협의체 정책 제안서 서식 & 파일 추출
                                </h3>
                                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                                    공유해주신 <strong>「제5기 청년정책협의체 정책제안서(서식)」</strong> 표 양식에 맞추어 실시간 작성·편집하고, <strong>HWP(한글) 및 DOCX(워드) 파일</strong>로 즉시 추출하실 수 있습니다.
                                </p>
                            </div>

                            <!-- 추출 버튼 모음 -->
                            <div class="flex flex-wrap items-center gap-2">
                                <button onclick="App.exportToHWP()" class="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition">
                                    <i data-lucide="file-text" class="w-4 h-4"></i>
                                    <span>HWP(한글) 추출</span>
                                </button>
                                <button onclick="App.exportToDOCX()" class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition">
                                    <i data-lucide="file-code" class="w-4 h-4"></i>
                                    <span>DOCX(워드) 추출</span>
                                </button>
                                <button onclick="App.copyProposalToClipboard()" class="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition">
                                    <i data-lucide="copy" class="w-4 h-4"></i>
                                    <span>텍스트 복사</span>
                                </button>
                                <button onclick="App.printProposal()" class="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition">
                                    <i data-lucide="printer" class="w-4 h-4"></i>
                                    <span>인쇄/PDF</span>
                                </button>
                                <a href="docs/제5기_청년정책협의체_정책제안서(서식).hwpx" download class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-xl transition" title="원본 서식 파일 다운로드">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                </a>
                            </div>
                        </div>

                        <!-- 5대 추천 정책 제안서 선택 카드 -->
                        <div>
                            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <i data-lucide="sparkles" class="w-4 h-4 text-amber-500"></i>
                                <span>2027~2030 추천 정책 제안서 5선 (클릭 시 아래 서식에 즉시 자동 입력됩니다)</span>
                            </h4>
                            <div id="proposal-cards-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <!-- Dynamic proposal cards injected via JS -->
                            </div>
                        </div>

                        <!-- 공식 정책제안서 표(Table) 서식 영역 (인쇄 및 HWP/DOCX 추출 대상) -->
                        <div id="printable-proposal-area" class="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-md space-y-4">
                            <!-- 문서 제목 -->
                            <div class="text-center pb-2">
                                <h3 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    화성시 청년정책협의체 정책 제안서
                                </h3>
                                <p class="text-xs font-semibold text-slate-500 mt-1">
                                    [동탄구 교육, 참여, 권리 분과]
                                </p>
                            </div>

                            <!-- 공문서 공식 표 서식 -->
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse border border-slate-900 text-xs sm:text-sm">
                                    <tbody>
                                        <!-- 분과명 -->
                                        <tr>
                                            <th class="w-28 sm:w-36 bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800">
                                                분 과 명
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3">
                                                <input id="form-division" type="text" class="w-full px-2 py-1 font-bold text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded" value="동탄구 교육, 참여, 권리 분과">
                                            </td>
                                        </tr>

                                        <!-- 제안명 -->
                                        <tr>
                                            <th class="bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800">
                                                제 안 명
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3">
                                                <input id="form-title" type="text" class="w-full px-2 py-1 font-extrabold text-base sm:text-lg text-blue-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded" placeholder="정책 제안명을 입력하세요">
                                            </td>
                                        </tr>

                                        <!-- 추진근거 -->
                                        <tr>
                                            <th class="bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800">
                                                추진근거
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3">
                                                <textarea id="form-basis" rows="2" class="w-full px-2 py-1 text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded leading-relaxed resize-y" placeholder="관련 조례, 법령 등 추진 근거를 입력하세요"></textarea>
                                            </td>
                                        </tr>

                                        <!-- 참고정책 -->
                                        <tr>
                                            <th class="bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800">
                                                참고정책
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3">
                                                <textarea id="form-ref-policy" rows="2" class="w-full px-2 py-1 text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded leading-relaxed resize-y" placeholder="온통청년 정책 및 타 지자체 벤치마킹 참고정책을 입력하세요"></textarea>
                                            </td>
                                        </tr>

                                        <!-- 제안배경 및 필요성 (헤더 및 세부행) -->
                                        <tr>
                                            <th rowspan="2" class="bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800 align-middle">
                                                제안배경<br>및<br>필요성
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3 bg-slate-50/50">
                                                <div class="font-bold text-xs text-rose-800 mb-1 flex items-center gap-1">
                                                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-500"></i>
                                                    <span>현황과 문제점</span>
                                                </div>
                                                <textarea id="form-problems" rows="4" class="w-full px-2 py-1 text-xs sm:text-sm text-slate-800 bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-lg leading-relaxed resize-y" placeholder="동탄 청년들이 겪고 있는 현황과 구체적 문제점을 서술하세요"></textarea>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="border border-slate-900 p-2 sm:p-3 bg-slate-50/50">
                                                <div class="font-bold text-xs text-blue-800 mb-1 flex items-center gap-1">
                                                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-blue-600"></i>
                                                    <span>개선방안</span>
                                                </div>
                                                <textarea id="form-solutions" rows="4" class="w-full px-2 py-1 text-xs sm:text-sm text-slate-800 bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-lg leading-relaxed resize-y" placeholder="문제점을 해결하기 위한 구체적인 개선 대안을 서술하세요"></textarea>
                                            </td>
                                        </tr>

                                        <!-- 제안내용 -->
                                        <tr>
                                            <th class="bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800">
                                                제안내용
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3">
                                                <textarea id="form-details" rows="8" class="w-full px-2 py-1 text-xs sm:text-sm text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded leading-relaxed resize-y" placeholder="사업대상, 추진기간, 소요예산, 세부 사업 계획 및 추진 체계를 상세히 작성하세요"></textarea>
                                            </td>
                                        </tr>

                                        <!-- 기대효과 -->
                                        <tr>
                                            <th class="bg-slate-100 border border-slate-900 p-3 font-bold text-center text-slate-800">
                                                기대효과
                                            </th>
                                            <td class="border border-slate-900 p-2 sm:p-3">
                                                <textarea id="form-effects" rows="4" class="w-full px-2 py-1 text-xs sm:text-sm text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded leading-relaxed resize-y" placeholder="정책 도입에 따른 정량적·정성적 기대효과 및 파급효과를 서술하세요"></textarea>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 하단 서명란 -->
                            <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                                <span>화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동</span>
                                <span>작성기준일: 2026. 09. 30.</span>
                            </div>
                        </div>

                        <!-- 하단 이전/완료 버튼 -->
                        <div class="pt-4 border-t border-slate-200 flex items-center justify-between no-print">
                            <button onclick="App.goToStep(4)" class="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm flex items-center space-x-2 transition">
                                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                                <span>이전 단계: 벤치마킹</span>
                            </button>
                            <div class="flex items-center space-x-2">
                                <button onclick="App.exportToHWP()" class="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow flex items-center space-x-1.5 transition">
                                    <i data-lucide="file-text" class="w-4 h-4"></i>
                                    <span>HWP 파일 추출</span>
                                </button>
                                <button onclick="App.exportToDOCX()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow flex items-center space-x-1.5 transition">
                                    <i data-lucide="file-code" class="w-4 h-4"></i>
                                    <span>DOCX 파일 추출</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>'''

# Replace Step 3 in html
p3 = re.compile(r'<!-- -+\s*-->\s*<!-- STEP 3: 관련 정책들 MCP.*?<!-- -+\s*-->\s*<!-- STEP 4:', re.DOTALL)
html = p3.sub(new_step_3 + '\n\n                <!-- ---------------------------------------------------------- -->\n                <!-- STEP 4:', html)

# Replace Step 5 in html
p5 = re.compile(r'<!-- -+\s*-->\s*<!-- STEP 5: 실현 가능성 높은 정책 제안 예시 5선.*?</div>\s*</div>\s*</div>\s*</section>', re.DOTALL)
html = p5.sub(new_step_5 + '\n\n            </div>\n        </section>', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html Step 3 and Step 5 successfully!")
