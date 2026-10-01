/**
 * 화성시 청년정책협의체
 * 1. 5번 탭 출석 명부 관리 데이터 (1번 사진 기반)
 * 2. 4번 탭 연간일정 간트차트 데이터 (2번 사진 기반, 2026~2027년 수정 가능)
 */

// ==============================================================
// 1. 5번 탭: 출석 명부 관리 데이터셋 (1번 사진 완벽 일치)
// ==============================================================

const ATTENDANCE_MEETINGS = [
    { id: "2026-04", label: "26년 4월", year: 2026, month: 4, type: "monthly" },
    { id: "2026-05", label: "26년 5월", year: 2026, month: 5, type: "monthly" },
    { id: "2026-06", label: "26년 6월", year: 2026, month: 6, type: "monthly" },
    { id: "2026-07", label: "26년 7월", year: 2026, month: 7, type: "monthly" },
    { id: "2026-08", label: "26년 8월", year: 2026, month: 8, type: "monthly" },
    { id: "2026-mayor", label: "시장님 간담회", year: 2026, month: 8, type: "special" },
    { id: "2026-youth-week", label: "청년 주간 행사", year: 2026, month: 9, type: "special" },
    { id: "2026-09", label: "26년 9월", year: 2026, month: 9, type: "monthly" },
    { id: "2026-10", label: "26년 10월", year: 2026, month: 10, type: "monthly" },
    { id: "2026-11", label: "26년 11월", year: 2026, month: 11, type: "monthly" },
    { id: "2026-12", label: "26년 12월", year: 2026, month: 12, type: "monthly" },
    { id: "2027-01", label: "27년 1월", year: 2027, month: 1, type: "monthly" },
    { id: "2027-02", label: "27년 2월", year: 2027, month: 2, type: "monthly" },
    { id: "2027-03", label: "27년 3월", year: 2027, month: 3, type: "monthly" },
    { id: "2027-04", label: "27년 4월", year: 2027, month: 4, type: "monthly" },
    { id: "2027-05", label: "27년 5월", year: 2027, month: 5, type: "monthly" },
    { id: "2027-06", label: "27년 6월", year: 2027, month: 6, type: "monthly" },
    { id: "2027-07", label: "27년 7월", year: 2027, month: 7, type: "monthly" },
    { id: "2027-08", label: "27년 8월", year: 2027, month: 8, type: "monthly" },
    { id: "2027-09", label: "27년 9월", year: 2027, month: 9, type: "monthly" },
    { id: "2027-10", label: "27년 10월", year: 2027, month: 10, type: "monthly" },
    { id: "2027-11", label: "27년 11월", year: 2027, month: 11, type: "monthly" },
    { id: "2027-12", label: "27년 12월", year: 2027, month: 12, type: "monthly" }
];

const ATTENDANCE_INITIAL_DATA = [
    {
        id: "att-1",
        memberId: "m1",
        name: "김남현",
        role: "분과장",
        records: {
            "2026-04": "O",
            "2026-05": "O",
            "2026-06": "O",
            "2026-07": "O",
            "2026-08": "O",
            "2026-mayor": "O",
            "2026-youth-week": "O [부스 운영, 간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-2",
        memberId: "m2",
        name: "김주연",
        role: "위원",
        records: {
            "2026-06": "O"
        },
        notes: ""
    },
    {
        id: "att-3",
        memberId: "m3",
        name: "곽보배",
        role: "위원",
        records: {
            "2026-04": "O",
            "2026-05": "O",
            "2026-06": "O",
            "2026-07": "O",
            "2026-08": "O",
            "2026-mayor": "O",
            "2026-youth-week": "O [부스 운영, 간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-4",
        memberId: "m4",
        name: "박고은",
        role: "위원",
        records: {
            "2026-04": "O",
            "2026-05": "O",
            "2026-06": "O",
            "2026-07": "O",
            "2026-mayor": "O",
            "2026-youth-week": "O [부스 운영, 간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-5",
        memberId: "m5",
        name: "박대호",
        role: "위원",
        records: {
            "2026-04": "O",
            "2026-05": "O",
            "2026-06": "O",
            "2026-mayor": "O",
            "2026-youth-week": "O [부스, 간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-6",
        memberId: "m6",
        name: "유소연",
        role: "위원",
        records: {
            "2026-05": "O",
            "2026-07": "O",
            "2026-08": "O",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-7",
        memberId: "m7",
        name: "윤손마",
        role: "위원",
        records: {
            "2026-04": "O",
            "2026-05": "O",
            "2026-07": "O",
            "2026-08": "O",
            "2026-youth-week": "O [간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-8",
        memberId: "m8",
        name: "음시연",
        role: "위원",
        records: {
            "2026-04": "O",
            "2026-06": "O",
            "2026-07": "O",
            "2026-youth-week": "O [부스 운영, 간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-9",
        memberId: "m9",
        name: "정선화",
        role: "위원",
        records: {
            "2026-04": "O",
            "2026-06": "O",
            "2026-07": "O",
            "2026-08": "O",
            "2026-09": "O"
        },
        notes: "본업과 널 관련 수요일 회의 시 참석 어려움 (260423)"
    },
    {
        id: "att-10",
        memberId: "m10",
        name: "정용준",
        role: "사무국장/위원",
        records: {
            "2026-05": "O",
            "2026-youth-week": "O [부스, 간담회]",
            "2026-09": "O"
        },
        notes: ""
    },
    {
        id: "att-11",
        memberId: "m11",
        name: "조찬우",
        role: "위원",
        records: {
            "2026-06": "O",
            "2026-08": "O"
        },
        notes: "야간 관련 평일 회의 참석 어려움 의사 표명 (260420)"
    },
    {
        id: "att-12",
        memberId: "m12",
        name: "채윤규",
        role: "위원",
        records: {
            "2026-05": "O",
            "2026-06": "O",
            "2026-07": "O",
            "2026-08": "O",
            "2026-mayor": "O",
            "2026-09": "O"
        },
        notes: ""
    }
];

// ==============================================================
// 2. 4번 탭: 연간일정 간트차트 데이터셋 (2번 사진 기반, 2026 및 2027년 동일 템플릿)
//    상태: "none"(빈칸), "prep"(회색: 준비/기획/활동), "event"(파란색: 본행사/총회)
// ==============================================================

const ANNUAL_SCHEDULE_INITIAL = {
    2026: [
        {
            id: "task-1",
            category: "조직구성",
            name: "위원 모집 및 선발",
            months: {
                1: "prep",
                2: "prep",
                3: "none", 4: "none", 5: "none", 6: "none",
                7: "none", 8: "none", 9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "화성시 청년정책협의체 제6기 신규 위원 공개모집, 서류심사 및 선발"
        },
        {
            id: "task-2",
            category: "공식행사",
            name: "위촉식 및 오리엔테이션",
            months: {
                1: "none", 2: "none",
                3: "event",
                4: "none", 5: "none", 6: "none",
                7: "none", 8: "none", 9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "위촉장 수여식, 오리엔테이션, 임원 선출 및 분과 구성"
        },
        {
            id: "task-3",
            category: "정기회의",
            name: "상반기 총회",
            months: {
                1: "none", 2: "none", 3: "none",
                4: "event",
                5: "none", 6: "none", 7: "none", 8: "none", 9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "상반기 정기총회 개최 및 연간 운영계획·분과별 활동 로드맵 의결"
        },
        {
            id: "task-4",
            category: "핵심축제",
            name: "청년의 날 행사 기획 및 참여",
            months: {
                1: "none", 2: "none",
                3: "prep", 4: "prep", 5: "prep", 6: "prep", 7: "prep", 8: "prep",
                9: "event",
                10: "none", 11: "none", 12: "none"
            },
            desc: "청년주간 및 청년의 날 기념행사 기획위원회 운영, 정책부스 운영 및 간담회"
        },
        {
            id: "task-5",
            category: "교류사업",
            name: "화톡DAY(분과별 교류 프로그램)",
            months: {
                1: "none", 2: "none", 3: "none", 4: "none",
                5: "event",
                6: "none", 7: "none",
                8: "event",
                9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "4개 구 및 분과 간 교류 증진 프로그램, 현장 소통 및 네트워킹"
        },
        {
            id: "task-6",
            category: "정기회의",
            name: "하반기 총회 및 성과공유회",
            months: {
                1: "none", 2: "none", 3: "none", 4: "none", 5: "none", 6: "none",
                7: "none", 8: "none", 9: "none", 10: "none", 11: "none",
                12: "event"
            },
            desc: "연간 정책제안 최종 보고, 우수 위원 표창 및 차년도 계획 공유"
        },
        {
            id: "task-7",
            category: "정책활동",
            name: "분과별 정책제안 활동",
            months: {
                1: "none", 2: "none",
                3: "prep", 4: "prep", 5: "prep", 6: "prep",
                7: "prep", 8: "prep", 9: "prep", 10: "prep", 11: "prep", 12: "prep"
            },
            desc: "동탄구 교육·참여·권리 분과 등 분야별 월례회의, 정책발굴, 설문조사 및 제안서 작성"
        }
    ],
    2027: [
        {
            id: "task-2027-1",
            category: "조직구성",
            name: "위원 추가모집 및 결원보충",
            months: {
                1: "prep",
                2: "prep",
                3: "none", 4: "none", 5: "none", 6: "none",
                7: "none", 8: "none", 9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "2차년도 결원 위원 보충 및 분과 재정비"
        },
        {
            id: "task-2027-2",
            category: "공식행사",
            name: "2차년도 발대식 및 오리엔테이션",
            months: {
                1: "none", 2: "none",
                3: "event",
                4: "none", 5: "none", 6: "none",
                7: "none", 8: "none", 9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "신규 위촉장 수여식, 2차년도 정책 추진방향 공유"
        },
        {
            id: "task-2027-3",
            category: "정기회의",
            name: "상반기 총회",
            months: {
                1: "none", 2: "none", 3: "none",
                4: "event",
                5: "none", 6: "none", 7: "none", 8: "none", 9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "상반기 정기총회 개최 및 2028년 예산반영 정책제안 검토"
        },
        {
            id: "task-2027-4",
            category: "핵심축제",
            name: "청년의 날 행사 기획 및 참여",
            months: {
                1: "none", 2: "none",
                3: "prep", 4: "prep", 5: "prep", 6: "prep", 7: "prep", 8: "prep",
                9: "event",
                10: "none", 11: "none", 12: "none"
            },
            desc: "2027 청년주간 기념행사 기획, 정책박람회 및 시장님 간담회"
        },
        {
            id: "task-2027-5",
            category: "교류사업",
            name: "화톡DAY(분과별 교류 프로그램)",
            months: {
                1: "none", 2: "none", 3: "none", 4: "none",
                5: "event",
                6: "none", 7: "none",
                8: "event",
                9: "none", 10: "none", 11: "none", 12: "none"
            },
            desc: "권역별·분과별 교류 프로그램 및 정책 모니터링 현장 워크숍"
        },
        {
            id: "task-2027-6",
            category: "정기회의",
            name: "하반기 총회 및 성과공유회",
            months: {
                1: "none", 2: "none", 3: "none", 4: "none", 5: "none", 6: "none",
                7: "none", 8: "none", 9: "none", 10: "none", 11: "none",
                12: "event"
            },
            desc: "제6기 2개년 임기 최종 성과보고회, 백서 발간 및 해단식"
        },
        {
            id: "task-2027-7",
            category: "정책활동",
            name: "분과별 정책제안 및 시정 모니터링",
            months: {
                1: "none", 2: "none",
                3: "prep", 4: "prep", 5: "prep", 6: "prep",
                7: "prep", 8: "prep", 9: "prep", 10: "prep", 11: "prep", 12: "prep"
            },
            desc: "기 제안 정책 집행 모니터링, 신규 정책제안서 작성 및 시정질의 피드백"
        }
    ]
};

if (typeof window !== "undefined") {
    window.ATTENDANCE_MEETINGS_INITIAL = ATTENDANCE_MEETINGS_INITIAL;
    window.ATTENDANCE_DATA_INITIAL = ATTENDANCE_DATA_INITIAL;
    window.ANNUAL_SCHEDULE_INITIAL = ANNUAL_SCHEDULE_INITIAL;
}
