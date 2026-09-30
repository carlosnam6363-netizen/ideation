/**
 * 화성시 청년정책협의체 전체 플로우 & 운영위원회 데이터베이스
 * - 회칙 제27조(정책제안·모니터링 및 차년도 운영계획) 기반 2개년 월별 연간계획
 *   * 1차년도: 2026년 (조직구성·정책발굴·의견수렴·예산의견서 수립)
 *   * 2차년도: 2027년 (정책제안 심화·모니터링·시정반영·최종보고)
 * - 회칙 제4조, 제10조, 제22조 기반 운영위원회 명단 및 직책별 역할
 */

const COUNCIL_FLOW_DATA = {
    meta: {
        title: "화성시 청년정책협의체 2026~2027 전체 연간 플로우",
        term: "제6기 (2년 임기)",
        year1: 2026,
        year2: 2027,
        basis: "화성시 청년 기본 조례 제18조 및 협의체 회칙 제27조"
    },

    // 회칙 및 임원 선출 이력에 따른 운영위원회 구성원 (총 16인)
    initialSteeringMembers: [
        // ==========================================
        // 1. 동탄구 (7인)
        // ==========================================
        {
            id: "sm-1",
            district: "동탄구",
            name: "윤재원",
            role: "회장, 동탄구회장",
            subrole: "협의체 회장 · 동탄구회장",
            roleKey: "president",
            phone: "",
            email: "",
            duties: "협의체를 대표하고 협의체 사무를 총괄하며 총회와 운영위원회의 의장이 된다(회칙 제13조제1항). 구위원회를 소집·주관하고 구 단위 청년의견 수렴, 지역현안 발굴, 분과 간 조정 및 운영위원회 제출안건의 취합을 담당한다(제13조제3항).",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200"
        },
        {
            id: "sm-2",
            district: "동탄구",
            name: "최민경",
            role: "사무국장",
            subrole: "임명직 임원 · 행정 총괄",
            roleKey: "secretary1",
            phone: "",
            email: "",
            duties: "총회·운영위원회 운영, 위원관리, 공통행정 및 기록관리를 담당한다(회칙 제13조의2제1항).",
            badgeColor: "bg-purple-100 text-purple-800 border-purple-200"
        },
        {
            id: "sm-3",
            district: "동탄구",
            name: "정용준",
            role: "사무국장",
            subrole: "임명직 임원 · 재정·기록",
            roleKey: "secretary2",
            phone: "",
            email: "",
            duties: "총회·운영위원회 운영, 위원관리, 공통행정 및 기록관리를 담당한다(회칙 제13조의2제1항).",
            badgeColor: "bg-violet-100 text-violet-800 border-violet-200"
        },
        {
            id: "sm-4",
            district: "동탄구",
            name: "최성호",
            role: "동탄구 일자리 분과장",
            subrole: "동탄구 분과위원장",
            roleKey: "dongtanJobLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
        },
        {
            id: "sm-5",
            district: "동탄구",
            name: "심덕용",
            role: "동탄구 주거 분과장",
            subrole: "동탄구 분과위원장",
            roleKey: "dongtanHousingLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
        },
        {
            id: "sm-6",
            district: "동탄구",
            name: "김남현",
            role: "동탄구 교육, 참여, 권리 분과장",
            subrole: "동탄구 분과위원장 (본 분과 대표)",
            roleKey: "dongtanBranchLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-amber-100 text-amber-800 border-amber-300 font-bold"
        },
        {
            id: "sm-7",
            district: "동탄구",
            name: "임서영",
            role: "동탄구 복지, 문화 분과장",
            subrole: "동탄구 분과위원장",
            roleKey: "dongtanWelfareLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
        },

        // ==========================================
        // 2. 만세구 (2인)
        // ==========================================
        {
            id: "sm-8",
            district: "만세구",
            name: "이주영",
            role: "만세구 구회장",
            subrole: "만세권역 총괄 운영위원",
            roleKey: "manseLeader",
            phone: "",
            email: "",
            duties: "구위원회를 소집·주관하고 구 단위 청년의견 수렴, 지역현안 발굴, 분과 간 조정 및 운영위원회 제출안건의 취합을 담당한다(회칙 제13조제3항).",
            badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
        },
        {
            id: "sm-10",
            district: "만세구",
            name: "김안나",
            role: "만세구 일자리, 교육, 참여, 권리 분과장",
            subrole: "만세구 분과위원장",
            roleKey: "manseJobEduLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
        },

        // ==========================================
        // 3. 병점구 (3인)
        // ==========================================
        {
            id: "sm-11",
            district: "병점구",
            name: "박희창",
            role: "부회장, 병점구회장",
            subrole: "협의체 부회장 · 병점구회장",
            roleKey: "vicePresident",
            phone: "",
            email: "",
            duties: "회장을 보좌하고 회장 유고 시 그 직무를 대행한다(회칙 제13조제2항). 구위원회를 소집·주관하고 구 단위 청년의견 수렴, 지역현안 발굴, 분과 간 조정 및 운영위원회 제출안건의 취합을 담당한다(제13조제3항).",
            badgeColor: "bg-sky-100 text-sky-800 border-sky-200"
        },
        {
            id: "sm-12",
            district: "병점구",
            name: "김나연",
            role: "병점구 일자리 분과장",
            subrole: "병점구 분과위원장",
            roleKey: "byeongjeomJobLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-sky-50 text-sky-700 border-sky-200"
        },
        {
            id: "sm-13",
            district: "병점구",
            name: "이혜빈",
            role: "병점구 주거, 복지, 문화 분과장",
            subrole: "병점구 분과위원장",
            roleKey: "byeongjeomHousingWelfareLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-sky-50 text-sky-700 border-sky-200"
        },

        // ==========================================
        // 4. 효행구 (3인)
        // ==========================================
        {
            id: "sm-14",
            district: "효행구",
            name: "윤동현",
            role: "효행구 구회장",
            subrole: "효행권역 총괄 운영위원",
            roleKey: "hyohengLeader",
            phone: "",
            email: "",
            duties: "구위원회를 소집·주관하고 구 단위 청년의견 수렴, 지역현안 발굴, 분과 간 조정 및 운영위원회 제출안건의 취합을 담당한다(회칙 제13조제3항).",
            badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200"
        },
        {
            id: "sm-15",
            district: "효행구",
            name: "박소연",
            role: "효행구 일자리, 교육, 참여, 권리 분과장",
            subrole: "효행구 분과위원장",
            roleKey: "hyohengJobEduLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200"
        },
        {
            id: "sm-16",
            district: "효행구",
            name: "이정수",
            role: "효행구 주거, 복지, 문화 분과장",
            subrole: "효행구 분과위원장",
            roleKey: "hyohengHousingWelfareLeader",
            phone: "",
            email: "",
            duties: "",
            badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200"
        }
    ],

    // 1차년도 (2026년) 월별 연간 플로우
    flow2026: [
        {
            month: 1,
            monthName: "1월",
            quarter: "Q1",
            category: "조직구성",
            title: "제6기 위원 공개모집 및 분과 편성 준비",
            bylawsRef: "회칙 제5조(위원의 자격), 제26조의1",
            deadline: "1월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "president",
            status: "완료",
            summary: "만 19~39세 관내 청년 대상 위원 공개모집 공고 및 4개 구·분과 배치 기준 수립",
            tasks: [
                "「화성시 청년 기본 조례」 제18조에 따른 공개모집 공고 및 신청서 접수",
                "동탄구, 만세구, 효행구, 병점구 등 4개 권역별 균형 배정 계획 수립",
                "동탄구 교육·참여·권리 분과 등 정책 분야별 분과 정원 배정"
            ]
        },
        {
            month: 2,
            monthName: "2월",
            quarter: "Q1",
            category: "임원선출",
            title: "위원 위촉식, 분과장 호선 & 4개 구위원장 선출",
            bylawsRef: "회칙 제11조(선출 및 임명) 제2항",
            deadline: "위촉 후 30일 이내",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "dongtanLeader",
            status: "완료",
            summary: "신규 위촉 후 30일 이내 각 구 소속 위원 투표로 구위원장 선출 및 분과장 호선 완료",
            tasks: [
                "화성특례시 제6기 청년정책협의체 전체 위촉식 진행",
                "각 분과별 첫 회의 소집 및 분과장(호선) 선출",
                "4개 구 소속 위원 전체 투표를 통해 구위원장 4인 선출 완료"
            ]
        },
        {
            month: 3,
            monthName: "3월",
            quarter: "Q1",
            category: "총회·운영위",
            title: "회장·부회장 총회 선출, 사무국장 임명 및 제1회 정기총회",
            bylawsRef: "회칙 제11조 제3~4항, 제19조(총회의 소집)",
            deadline: "3월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "president",
            status: "완료",
            summary: "구위원장 중 총회 투표로 회장·부회장 선출, 사무국장 임명으로 운영위원회 구성 완결",
            tasks: [
                "전체 총회를 소집하여 4인 구위원장 중 회장 및 부회장 선출 (구위원장 겸임)",
                "회장이 선출 후 14일 이내 사무국장 2인 및 홍보팀장 임명 완료",
                "상반기 정기총회 개최: 회칙 개정안 심의 및 2026 연간 활동 기본방향 의결"
            ]
        },
        {
            month: 4,
            monthName: "4월",
            quarter: "Q2",
            category: "정책스터디",
            title: "분과별 기존 정책 전수검토 및 역량강화 워크숍",
            bylawsRef: "회칙 제3조 제1항, 제26조의1 제3항",
            deadline: "4월 30일",
            inChargeRole: "분과장",
            inChargeKey: "dongtanBranchLeader",
            status: "진행중",
            summary: "온통청년 및 화성시 기존 청년지원사업 스터디, 분과 오프라인 공식회의 정례화",
            tasks: [
                "분과위원회 월 1회 오프라인 필수 회의 진행 (교육·참여·권리 의제 선정)",
                "화성시 청년청 및 경기도 청년정책 데이터베이스 전수 분석",
                "신임 위원 대상 정책제안서 작성법 및 지방자치 조례 입법 역량강화 교육"
            ]
        },
        {
            month: 5,
            monthName: "5월",
            quarter: "Q2",
            category: "의견수렴",
            title: "동탄 권역 청년 설문조사 & 현장 의견수렴 킥오프",
            bylawsRef: "회칙 제3조 제1호, 제26조의2(구위원회)",
            deadline: "5월 31일",
            inChargeRole: "분과장",
            inChargeKey: "dongtanLeader",
            status: "예정",
            summary: "동탄 테크노밸리, 오피스텔 1인가구 청년 대상 생활권 설문조사 온·오프라인 병행",
            tasks: [
                "구위원회가 생활권별 설문 문항 설계 및 동탄역·호수공원 현장 설문 진행",
                "청년 삶 실태조사(국무조정실/경기연구원)와 화성시 지표 비교 분석",
                "홍보팀 카드뉴스 발행: '화성 청년들의 솔직한 생각 조사' SNS 릴리즈"
            ]
        },
        {
            month: 6,
            monthName: "6월",
            quarter: "Q2",
            category: "예산수요",
            title: "2027년도 활동·사업계획 및 필요예산 수요 취합",
            bylawsRef: "회칙 제27조(정책제안 등) 제4항 ★핵심기한",
            deadline: "6월 30일 (마감)",
            inChargeRole: "분과장",
            inChargeKey: "dongtanBranchLeader",
            status: "예정",
            summary: "회칙 제27조제4항에 따라 1차년도 활동기구는 2027년도 활동계획과 필요예산을 운영위에 제출",
            tasks: [
                "동탄구 분과 내 2027년 필요 교육 프로그램 패들렛 최종 수합 완료",
                "차년도(2027) 분과별 추진 사업계획서 및 소요예산 산출 내역 작성",
                "6월 30일까지 운영위원회(사무국)로 분과별 공식 제출 완료"
            ]
        },
        {
            month: 7,
            monthName: "7월",
            quarter: "Q3",
            category: "시정제출",
            title: "「차년도 협의체 운영계획 및 필요예산 의견서」 화성시 공식 제출",
            bylawsRef: "회칙 제27조 제5항 ★법정제출일",
            deadline: "7월 31일 (법정마감)",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "president",
            status: "예정",
            summary: "운영위원회가 분과 자료를 취합하여 7월 31일까지 화성시(청년정책과)에 정식 공문 제출",
            tasks: [
                "운영위원회 7월 정기회의 소집: 4개 구·분과 예산 수요 종합 심의·조정",
                "「2027 화성시 청년정책협의체 운영계획 및 필요예산 의견서」 확정",
                "화성특례시 본예산 편성에 반영될 수 있도록 담당부서 사전 협의 및 공식 제출"
            ]
        },
        {
            month: 8,
            monthName: "8월",
            quarter: "Q3",
            category: "아이디에이션",
            title: "정책제안 아이디에이션 & 타 지자체 벤치마킹 워크숍",
            bylawsRef: "회칙 제27조의2(공식활동의 범위)",
            deadline: "8월 31일",
            inChargeRole: "분과장",
            inChargeKey: "secretary1",
            status: "예정",
            summary: "청년친화도시(부산진구, 공주시 등) 우수사례 접목 및 정책제안 5단계 파이프라인 가동",
            tasks: [
                "아이디에이션 플랫폼 5단계 워크플로우 실습 (온통청년 2,934건 MCP 연계)",
                "동탄구 교육·참여·권리 맞춤형 5대 추천 정책 모델 정밀 분석",
                "분과별 전문가 멘토링 매칭 및 실현 가능성 1차 검증"
            ]
        },
        {
            month: 9,
            monthName: "9월",
            quarter: "Q3",
            category: "행사·축제",
            title: "화성시 청년의 날 기념행사 참여 & 공식 정책부스 운영",
            bylawsRef: "회칙 제3조 제6호, 제26조의3(홍보팀)",
            deadline: "9월 셋째 주 토요일(청년의 날)",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "prLeader",
            status: "예정",
            summary: "청년기본법 지정 청년의 날 행사 참가 및 시민 대상 정책 아이디어 공모 부스 운영",
            tasks: [
                "화성시 청년의 날 기념 공식 축제장 내 협의체 정책 참여 부스 기획 및 운영",
                "동탄구 청년 정책 스티커 투표 및 시민 의견 카드 1,000건 이상 접수",
                "홍보팀 현장 영상 스케치 및 릴스 제작 배포"
            ]
        },
        {
            month: 10,
            monthName: "10월",
            quarter: "Q4",
            category: "정책발굴",
            title: "정책제안서 세부 과제 도출 & 관계부서 1차 간담회",
            bylawsRef: "회칙 제27조 제2항 제1호 (1차연도 2~10월)",
            deadline: "10월 31일",
            inChargeRole: "분과장",
            inChargeKey: "dongtanBranchLeader",
            status: "예정",
            summary: "2월부터 10월까지 진행된 정책 발굴 활동 집대성 및 화성시 실무부서 의견 조회",
            tasks: [
                "분과별 제5기 정책제안서 서식 기반 과제 1~2건 확정",
                "추진근거(조례/법령) 및 현황 문제점 데이터 보완",
                "화성시 청년정책과 및 유관부서(기업투자실, 자치행정과 등) 사전 의견 청취"
            ]
        },
        {
            month: 11,
            monthName: "11월",
            quarter: "Q4",
            category: "제안서보고",
            title: "정책제안서 초안 작성 완료 & 청년정책과 1차 보고",
            bylawsRef: "회칙 제27조 제2항 (11월 보고), 제19조(하반기 총회)",
            deadline: "11월 30일",
            inChargeRole: "분과장",
            inChargeKey: "president",
            status: "예정",
            summary: "분과별 정책제안서 초안 작성 완료 후 청년정책과 공식 보고 및 하반기 총회 승인",
            tasks: [
                "분과별 정책제안서 초안(HWP/DOCX) 완성 및 운영위원회 상정",
                "화성시 청년정책과에 1차 정책제안서 초안 공식 보고",
                "하반기 정기총회 개최: 1차년도 활동 경과보고 및 2027 정책제안서 초안 공유"
            ]
        },
        {
            month: 12,
            monthName: "12월",
            quarter: "Q4",
            category: "성과결산",
            title: "1차년도 성과 결산 보고회 & 자체회비 결산 공시",
            bylawsRef: "회칙 제21조(총회의결), 제30조(회계연도)",
            deadline: "12월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "secretary2",
            status: "예정",
            summary: "2026년 활동 결산 보고서 작성, 자체회비 수입·지출 결산 및 우수위원 표창 추천",
            tasks: [
                "1차년도 활동보고서 발간 및 협의체 홈페이지/자료실 공시",
                "자체회비 및 활동경비 결산 내역 운영위 의결 및 회원 공지",
                "우수 활동 위원 화성시장 표창 추천 심의 (회칙 제8조 위원의 상훈)"
            ]
        }
    ],

    // 2차년도 (2027년) 월별 연간 플로우
    flow2027: [
        {
            month: 1,
            monthName: "1월",
            quarter: "Q1",
            category: "피드백분석",
            title: "청년정책위원회 1차 검토의견 수렴 & 피드백 반영 회의",
            bylawsRef: "회칙 제27조 제2항 제2호 (2차연도 1월)",
            deadline: "1월 31일",
            inChargeRole: "분과장",
            inChargeKey: "president",
            status: "예정",
            summary: "화성시 청년정책위원회의 1차 심의 의견을 전달받고 분과별 보완 전략 수립",
            tasks: [
                "청년정책과로부터 청년정책위원회 1차 검토 결과 및 부서 의견서 접수",
                "운영위원회 긴급 소집: 부서별 검토 피드백 분류(수용, 중장기검토, 수정요청)",
                "동탄구 분과 회의 개최: 정책제안서 보완 방향 및 데이터 보강 계획 수립"
            ]
        },
        {
            month: 2,
            monthName: "2월",
            quarter: "Q1",
            category: "제안서보완",
            title: "제안서 수정·보완 활동 & 청년 리빙랩 실험 계획 수립",
            bylawsRef: "회칙 제27조 제2항, 제27조의2",
            deadline: "2월 28일",
            inChargeRole: "분과장",
            inChargeKey: "dongtanBranchLeader",
            status: "예정",
            summary: "예산 추계 정밀화, 타 지자체 법적 근거 보강 및 현장 검증형 리빙랩 설계",
            tasks: [
                "수요예산 세부 산출내역서(원가 계산, 강사료 기준, 바우처 단가) 재검토",
                "동탄 청년들이 체감할 수 있는 '청년 리빙랩' 시범 사업 모델 설계",
                "관련 상위 법령(청년기본법, 평생교육법 등) 및 시 조례 개정안 초안 연계"
            ]
        },
        {
            month: 3,
            monthName: "3월",
            quarter: "Q1",
            category: "정기총회",
            title: "2027년 상반기 정기총회 & 모니터링단 발족",
            bylawsRef: "회칙 제19조(정기총회), 제27조 제3항",
            deadline: "3월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "secretary1",
            status: "예정",
            summary: "2차년도 중점 과제인 '청년정책 모니터링' 사업 추진을 위한 총회 결의",
            tasks: [
                "2027 상반기 정기총회 개최: 보완된 정책제안서 중간 점검",
                "기존 화성시 청년정책 사업 모니터링단(청년 옴부즈만) 분과별 구성",
                "홍보팀 2027 연간 캠페인: '우리가 만드는 화성 청년정책 2027' 런칭"
            ]
        },
        {
            month: 4,
            monthName: "4월",
            quarter: "Q2",
            category: "현장모니터링",
            title: "화성시 청년사업 현장 모니터링 & 청년 심층 인터뷰(FGI)",
            bylawsRef: "회칙 제3조 제3호, 제27조의2",
            deadline: "4월 30일",
            inChargeRole: "분과장",
            inChargeKey: "dongtanLeader",
            status: "예정",
            summary: "청년공간, 면접정장 대여, 청년배당 등 현행 화성시 사업 이용자 만족도 심층 조사",
            tasks: [
                "동탄권역 청년공간(청년스테이션 등) 현장 방문 실태조사 및 인터뷰",
                "집행률 저조 사업 및 청년 사각지대 발굴을 위한 FGI(포커스그룹인터뷰) 5회 실시",
                "모니터링 평가 시트 작성 및 개선 권고사항 도출"
            ]
        },
        {
            month: 5,
            monthName: "5월",
            quarter: "Q2",
            category: "제안서완성",
            title: "정책제안서 최종본 작성 & 정책조정 전문가 자문",
            bylawsRef: "회칙 제27조 제2항 제2호 (1~6월 보완활동)",
            deadline: "5월 31일",
            inChargeRole: "분과장",
            inChargeKey: "dongtanBranchLeader",
            status: "예정",
            summary: "화성연구원, 시의회 청년의원, 대학교수 등 전문가 그룹 최종 감수 진행",
            tasks: [
                "제5기 서식에 맞춘 7개 항목(추진근거, 문제점, 해결방안, 기대효과 등) 최종 문안 확정",
                "전문가 자문회의 개최: 사업 실현 가능성 및 조례 충돌 여부 최종 검증",
                "HWP 및 DOCX 최종 공문서 파일 추출 및 분과 서명 완료"
            ]
        },
        {
            month: 6,
            monthName: "6월",
            quarter: "Q2",
            category: "최종보고",
            title: "2027 정책제안서 최종 제출 & 청년정책과 공식 보고",
            bylawsRef: "회칙 제27조 제2항 및 제4항 ★핵심마감",
            deadline: "6월 30일 (최종제출)",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "president",
            status: "예정",
            summary: "2년 임기 동안 연구·개발한 정책제안서를 화성시에 최종 공식 보고 및 제출",
            tasks: [
                "분과별 정책제안서 최종본 및 2차년도 모니터링 결과보고서 취합",
                "운영위원회 의결을 거쳐 「화성특례시 2027 청년 정책제안서」 최종본 확정",
                "6월 30일까지 화성시 청년정책과에 공식 공문 및 문서 일체 제출 완료"
            ]
        },
        {
            month: 7,
            monthName: "7월",
            quarter: "Q3",
            category: "최종심의",
            title: "화성시 청년정책위원회 최종 검토 & 모니터링 보고서 제출",
            bylawsRef: "회칙 제27조 제2항 및 제5항 (7월 31일 마감)",
            deadline: "7월 31일 (법정마감)",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "president",
            status: "예정",
            summary: "청년정책위원회 최종 심의에 회장단이 참석하여 제안 제안 설명 및 답변 진행",
            tasks: [
                "7월 31일까지 「2027 청년정책 모니터링 결과보고서」 법정 제출 완료",
                "화성시 청년정책위원회 본회의 참석: 제안 정책별 우선순위 및 타당성 설명",
                "각 구위원장 및 분과장 배석: 실무부서 검토의견에 대한 대안 제시"
            ]
        },
        {
            month: 8,
            monthName: "8월",
            quarter: "Q3",
            category: "예산반영",
            title: "2028년도 화성시 본예산 편성 연계 협의 (사업부서)",
            bylawsRef: "회칙 제27조 제2항 (사업부서 정책반영)",
            deadline: "8월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "secretary1",
            status: "예정",
            summary: "최종 승인된 정책제안 과제가 차년도 화성시 본예산 편성에 확정되도록 부서 매칭",
            tasks: [
                "예산편성 시기에 맞추어 화성시 기획예산실 및 해당 사업부서(일자리청년과 등) 협의",
                "주민참여예산 및 청년참여자율예산 제도와 연계하여 예산 확보 지원",
                "정책 제안 과제별 부서 배정 현황 및 예산 심의 결과 트래킹"
            ]
        },
        {
            month: 9,
            monthName: "9월",
            quarter: "Q3",
            category: "성과발표",
            title: "2027 화성시 청년의 날 기념 정책발표회 & 페스티벌",
            bylawsRef: "회칙 제3조 제6호, 제26조의3",
            deadline: "9월 청년의 날",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "prLeader",
            status: "예정",
            summary: "2년간 제안하고 반영된 정책 성과를 화성시 청년들과 시민들에게 공개 발표",
            tasks: [
                "청년의 날 특별 세션: 「제6기 협의체가 바꾼 화성 청년의 삶」 정책 쇼케이스",
                "동탄구 교육 프로그램 실무 결과물 및 정책제안서 전시회 부스 운영",
                "홍보팀 성과 홍보 책자 배포 및 SNS 성과 릴리즈 영상 공개"
            ]
        },
        {
            month: 10,
            monthName: "10월",
            quarter: "Q4",
            category: "사후점검",
            title: "시의회 예산안 심의 모니터링 & 정책 반영 현황 점검",
            bylawsRef: "회칙 제3조 제3호 (정책평가 및 후속점검)",
            deadline: "10월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "vicePresident",
            status: "예정",
            summary: "화성시의회 본예산 심의 과정 모니터링 및 제안 정책의 삭감 방지 대응",
            tasks: [
                "화성시의회 교육복지위원회 등 상임위원회 청년예산 심의 일정 모니터링",
                "시의원 간담회 추진: 청년정책협의체 제안사업의 필요성 설명 및 원안 통과 요청",
                "최종 예산 확정 현황 분석 및 반영률 통계 산출"
            ]
        },
        {
            month: 11,
            monthName: "11월",
            quarter: "Q4",
            category: "백서제작",
            title: "제6기 청년정책협의체 백서 발간 및 하반기 총회",
            bylawsRef: "회칙 제19조(정기총회), 제21조",
            deadline: "11월 30일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "secretary1",
            status: "예정",
            summary: "2년간의 12개 분과 활동 기록, 정책제안서 5선, 모니터링 보고서 집대성 백서 발간",
            tasks: [
                "「제6기 화성시 청년정책협의체 활동백서 (2026~2027)」 기획 및 발간",
                "하반기 결산 총회 개최: 2년 임기 최종 활동 보고 및 승인",
                "자체회비 최종 결산 및 남은 잔여 재산 인계 절차 승인"
            ]
        },
        {
            month: 12,
            monthName: "12월",
            quarter: "Q4",
            category: "임기만료",
            title: "제6기 수료식 & 제7기 차기 협의체 인수인계",
            bylawsRef: "회칙 제5조 제2항 (임기 2년 만료)",
            deadline: "12월 31일",
            inChargeRole: "운영위원회 담당",
            inChargeKey: "president",
            status: "예정",
            summary: "2년 공식 임기 만료, 수료증 전달식 및 차기 제7기 협의체를 위한 아카이브 인계",
            tasks: [
                "제6기 청년정책협의체 수료식 및 화성시장 수료증·표창 수여",
                "플랫폼 데이터(패들렛, 정책DB, 회칙 개정안) 차기 기수로 인수인계",
                "2026~2027 화성시 청년 거버넌스 2년 대장정 공식 종료"
            ]
        }
    ]
};

/**
 * 동탄구 교육·참여·권리 분과 위원 초기 명단 (엑셀 원본 기준)
 * 관리자 권한 인증 시에만 연락처가 공개 표기됩니다.
 */
const DIVISION_MEMBERS_INITIAL = [
    {
        id: "dm-1",
        name: "김남현",
        role: "분과장",
        phone: "010-2232-3442",
        email: ""
    },
    {
        id: "dm-2",
        name: "박고은",
        role: "위원",
        phone: "010-7409-3355",
        email: ""
    },
    {
        id: "dm-3",
        name: "채윤규",
        role: "위원",
        phone: "010-9365-0176",
        email: ""
    },
    {
        id: "dm-4",
        name: "음시연",
        role: "위원",
        phone: "010-4007-5946",
        email: ""
    },
    {
        id: "dm-5",
        name: "유소연",
        role: "위원",
        phone: "010-2220-9027",
        email: ""
    },
    {
        id: "dm-6",
        name: "조찬우",
        role: "위원",
        phone: "010-8895-0455",
        email: ""
    },
    {
        id: "dm-7",
        name: "정선화",
        role: "위원",
        phone: "010-8288-4422",
        email: ""
    },
    {
        id: "dm-8",
        name: "김주연",
        role: "위원",
        phone: "010-4809-6074",
        email: ""
    },
    {
        id: "dm-9",
        name: "정용준",
        role: "위원",
        phone: "010-8619-7894",
        email: ""
    },
    {
        id: "dm-10",
        name: "곽보배",
        role: "위원",
        phone: "010-6521-2336",
        email: ""
    },
    {
        id: "dm-11",
        name: "윤솔아",
        role: "위원",
        phone: "010-7196-4211",
        email: ""
    },
    {
        id: "dm-12",
        name: "박대호",
        role: "위원",
        phone: "010-5061-5697",
        email: ""
    }
];

