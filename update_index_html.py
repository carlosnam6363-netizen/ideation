import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace script tag
if 'js/bylaws_diff.js' not in html:
    html = html.replace('<script src="js/data.js"></script>', '<script src="js/data.js"></script>\n    <script src="js/bylaws_diff.js"></script>')

new_tab_3 = '''        <!-- ============================================================== -->
        <!-- 탭 3: 회칙 정리 (신구조문대비표 & 개정검토본) -->
        <!-- ============================================================== -->
        <section id="tab-3" class="tab-content-panel hidden space-y-6">
            <!-- 공식 개정안 헤더 배너 -->
            <div class="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div class="relative z-10 max-w-4xl">
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-extrabold border border-blue-400/30 backdrop-blur-md">
                            <i data-lucide="file-check-2" class="w-3.5 h-3.5 text-teal-300"></i>
                            <span>제6기 공식 회칙 개정 검토본</span>
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                            검토기준일: 2026. 9. 26.
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                            부칙 일부 수정 반영
                        </span>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                        화성시 청년정책협의체 회칙 <span class="text-teal-400">신·구 조문 대비표</span>
                    </h2>
                    <p class="text-blue-100 text-xs sm:text-sm leading-relaxed mb-4">
                        화성특례시 출범과 제6기 협의체 적용을 위해 수립된 <strong>조직개편(4개 구 체제)·재정운영·외부 후원금품·활동행정 법령근거 반영안</strong>입니다.<br>
                        기존 내용(현행)과 변경 내용(개정안)의 차이점을 한눈에 비교하실 수 있도록 2열 대비 및 하이라이트로 구성되었습니다.
                    </p>
                    <div class="flex flex-wrap items-center gap-3">
                        <a href="docs/화성시_청년정책협의체_회칙_개정검토본_수정본(부칙일부수정).hwpx" download class="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span>원본 HWPX 파일 다운로드</span>
                        </a>
                        <span class="text-[11px] text-slate-300">※ 카카오톡 공유 원본 파일 연동 완료</span>
                    </div>
                </div>
                <div class="absolute -right-8 -bottom-8 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            <!-- 제6기 4대 핵심 개정 포인트 요약 카드 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition">
                    <div class="flex items-center space-x-2 text-blue-600 font-bold text-xs mb-1.5">
                        <i data-lucide="landmark" class="w-4 h-4"></i>
                        <span>1. 조직개편 (제4조, 제10조)</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">구위원장 중심 책임 운영</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        기존 임명직 '운영위원 5인' 폐지. 4개 구(동탄구 등) 소속 위원이 직접 선출한 <strong>구위원장 4인 + 사무국장 2인</strong>으로 운영위원회 정예화.
                    </p>
                </div>

                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition">
                    <div class="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-1.5">
                        <i data-lucide="share-2" class="w-4 h-4"></i>
                        <span>2. 소통 확대 (제26조의3)</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">공식 '홍보팀' 신설</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        「청년기본법」 제4조제5항에 근거, 청년·시민과의 활발한 소통을 위해 <strong>SNS·카드뉴스·영상·청년축제</strong>를 전담하는 홍보팀 신설.
                    </p>
                </div>

                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-purple-400 transition">
                    <div class="flex items-center space-x-2 text-purple-600 font-bold text-xs mb-1.5">
                        <i data-lucide="wallet" class="w-4 h-4"></i>
                        <span>3. 활동경비 법제화 (제27조의2~5)</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">공식활동 기준 및 증빙 명문화</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        시 예산 지원 대상이 되는 공식활동의 범위를 명확히 규정하고, <strong>사전계획서·결과보고서·행정책임자 지정</strong>으로 감사 지적 예방.
                    </p>
                </div>

                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center space-x-2 text-amber-600 font-bold text-xs mb-1.5">
                        <i data-lucide="shield-check" class="w-4 h-4"></i>
                        <span>4. 투명 회계 (제30조~32조)</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">기부금품법 준수 & 계좌 개설</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        시 지원금과 자체회비 분리 관리. 1천만원 미만 <strong>외부 후원금품 사전심의·결산공개</strong> 및 국세기본법상 고유번호증 발급 토대 마련.
                    </p>
                </div>
            </div>

            <!-- 신구조문대비표 컨트롤 바 (뷰모드 전환, 필터, 검색) -->
            <div class="glass-card p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <!-- 좌측: 뷰 모드 스위처 (대비표 vs 개정안만 vs 현행만) -->
                    <div class="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100 w-full md:w-auto justify-center">
                        <button id="bylaw-view-diff-btn" onclick="App.setBylawViewMode('diff')" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white transition flex items-center space-x-1.5 shadow-sm">
                            <i data-lucide="split" class="w-3.5 h-3.5"></i>
                            <span>신·구 조문 대비표 (2열 비교)</span>
                        </button>
                        <button id="bylaw-view-revised-btn" onclick="App.setBylawViewMode('revised')" class="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1.5">
                            <i data-lucide="file-check" class="w-3.5 h-3.5"></i>
                            <span>제6기 개정안 전문</span>
                        </button>
                        <button id="bylaw-view-current-btn" onclick="App.setBylawViewMode('current')" class="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1.5">
                            <i data-lucide="history" class="w-3.5 h-3.5"></i>
                            <span>종전 현행 조문</span>
                        </button>
                    </div>

                    <!-- 우측: 검색창 및 조항 수 카운트 -->
                    <div class="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                        <div class="relative w-full md:w-72">
                            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
                            <input id="bylaw-search-input" type="text" placeholder="조항명, 키워드(예: 구위원장, 후원금, 해촉)..." class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
                        </div>
                        <span id="bylaw-count-badge" class="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 whitespace-nowrap">
                            총 14개 주요 조항
                        </span>
                    </div>
                </div>

                <!-- 챕터 & 유형 필터 칩 -->
                <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                    <span class="font-bold text-slate-400 mr-1 uppercase text-[11px]">필터:</span>
                    <button onclick="App.filterBylaws('all')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-bold bg-slate-900 text-white transition">전체</button>
                    <button onclick="App.filterBylaws('important')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1">
                        <span>⭐ 핵심 개정</span>
                    </button>
                    <button onclick="App.filterBylaws('new')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1">
                        <span>✨ 조항 신설</span>
                    </button>
                    <button onclick="App.filterBylaws('제1장 총칙')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">제1장 총칙</button>
                    <button onclick="App.filterBylaws('제2장 위원')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">제2장 위원</button>
                    <button onclick="App.filterBylaws('제3장 임원 및 운영직')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">제3장 임원</button>
                    <button onclick="App.filterBylaws('제5장 운영위원회')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">제5장 운영위</button>
                    <button onclick="App.filterBylaws('제6장 위원회 운영')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">제6장 분과·구위</button>
                    <button onclick="App.filterBylaws('제8장 재정 및 회계')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">제8장 재정·회계</button>
                    <button onclick="App.filterBylaws('부칙')" class="bylaw-filter-chip px-3 py-1 rounded-lg font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition">부칙</button>
                </div>
            </div>

            <!-- 신구조문대비표 메인 목록 컨테이너 (JS 동적 렌더링) -->
            <div id="bylaws-diff-container" class="space-y-6">
                <!-- Injected via App.renderBylawsDiff() -->
            </div>

            <!-- 하단 2단 레이아웃: 관련 법령 및 해석례 + 공식 파일 보관함 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-slate-200">
                <!-- 좌측: 주요 법령 및 법제처 해석례 요약집 (7열) -->
                <div class="lg:col-span-7 glass-card p-6 rounded-2xl shadow-sm">
                    <div class="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-3">
                        <i data-lucide="scale" class="w-4 h-4 text-blue-600"></i>
                        <span>개정 검토본 반영 주요 법령 및 유권해석 근거</span>
                    </div>
                    <div class="space-y-2.5 text-xs text-slate-600">
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <strong class="text-slate-800 block mb-0.5">· 「화성시 청년 기본 조례」 제18조 (협의체의 설치·운영)</strong>
                            <p class="text-[11px] text-slate-500">시장은 의견수렴·모니터링 등을 위하여 협의체를 구성·운영할 수 있고 활동경비를 지원할 수 있으며, 모집 및 운영 등에 관한 세부사항은 청년 의견을 반영하여 정함.</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <strong class="text-slate-800 block mb-0.5">· 「기부금품의 모집 및 사용에 관한 법률」 제2조, 제4조, 제5조</strong>
                            <p class="text-[11px] text-slate-500">회칙에 따른 회원 회비는 기부금품에서 제외. 외부 후원금 1천만원 미만은 등록 제외되나 지자체 명의를 이용한 강제 모집은 엄격 금지.</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <strong class="text-slate-800 block mb-0.5">· 「국세기본법」 제13조 & 「금융실명법 시행령」 제3조</strong>
                            <p class="text-[11px] text-slate-500">규약과 대표자를 갖춘 비법인 단체는 세무서 승인으로 고유번호증을 발급받아 협의체 명의 공식 통장 개설 가능.</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <strong class="text-slate-800 block mb-0.5">· 법제처 법령해석 24-0501, 15-0798 (연임 관련)</strong>
                            <p class="text-[11px] text-slate-500">'연임'은 같은 직위를 연속하여 다시 맡는 것을 뜻하며, 중임(단절 후 재선출)까지 일괄 금지하는 것은 아님. 제6기부터 구위원장·분과장 연임제한 해제 적용 근거.</p>
                        </div>
                    </div>
                </div>

                <!-- 우측: 원본 파일 다운로드 및 추가 파일 보관함 (5열) -->
                <div class="lg:col-span-5 glass-card p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2">
                            <i data-lucide="folder-check" class="w-4 h-4 text-emerald-600"></i>
                            <span>공식 회칙 문서 보관함</span>
                        </div>
                        <p class="text-xs text-slate-500 mb-4">
                            공유받으신 HWPX 파일이 플랫폼 내부 보관함에 동기화되어 있습니다.
                        </p>

                        <!-- 원본 파일 다운로드 카드 -->
                        <div class="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-3 min-w-0">
                                <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                    HWPX
                                </div>
                                <div class="min-w-0">
                                    <p class="font-bold text-slate-900 text-xs truncate">화성시_청년정책협의체_회칙_개정검토본_수정본.hwpx</p>
                                    <p class="text-[11px] text-slate-500">73.5 KB | 검토본 원본 문서</p>
                                </div>
                            </div>
                            <a href="docs/화성시_청년정책협의체_회칙_개정검토본_수정본(부칙일부수정).hwpx" download class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition" title="다운로드">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>

                        <!-- 추가 파일 드래그 & 드롭 영역 -->
                        <div id="bylaws-dropzone" class="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition">
                            <i data-lucide="cloud-upload" class="w-6 h-6 mx-auto mb-1 text-slate-400"></i>
                            <p class="text-xs font-bold text-slate-700">추가 수정본 파일 드래그 업로드</p>
                            <input id="bylaws-file-input" type="file" multiple class="hidden">
                        </div>

                        <!-- 업로드된 추가 파일 목록 -->
                        <div id="bylaws-files-list" class="mt-3"></div>
                    </div>

                    <div class="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>화성시 청년정책협의체 회칙심의위원회</span>
                        <span>최종 수정본 적용</span>
                    </div>
                </div>
            </div>
        </section>'''

# Replace tab-3 section in html
# We can use regex to replace section id="tab-3" ... </section>
pattern = re.compile(r'<!-- =+\s*-->\s*<!-- 탭 3: 회칙 정리.*?-->\s*<!-- =+\s*-->\s*<section id="tab-3".*?</section>', re.DOTALL)
if pattern.search(html):
    html = pattern.sub(new_tab_3, html)
    print("Replaced tab-3 via regex successfully!")
else:
    print("Could not find regex match for tab-3. Checking fallback...")
    # fallback: replace from <section id="tab-3" to next </section>
    p2 = re.compile(r'<section id="tab-3".*?</section>', re.DOTALL)
    html = p2.sub(new_tab_3, html)
    print("Replaced tab-3 via fallback regex!")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html updated successfully!")
