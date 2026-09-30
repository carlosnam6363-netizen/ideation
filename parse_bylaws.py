import re
import json

with open('hwpx_extracted.txt', 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f.readlines() if line.strip()]

# Let's inspect the flow of articles
# A pattern like:
# 제X조(...)
# [현행 텍스트]
# ▶ 개정안
# 제X조(...)
# [개정안 텍스트]
# [검토근거: ...]

# Let's write a targeted parser to build high-quality structured comparison items
items = []

# We can manually define the structured items or parse them precisely from the text
# Let's write a python parser to extract blocks
text = '\n'.join(lines)

# Split by chapters or articles
# Key articles to cover:
# 제2조(목적), 제3조(활동), 제4조(조직), 제5조(위원의 자격), 제6조(위원의 권리), 제7조(위원의 의무), 제8조(위원의 상훈), 제9조(위원의 해촉 요청)
# 제10조(임원의 구성), 제11조(선출 및 임명), 제12조(보궐선출 및 임명), 제13조(직책별 직무), 제13조의2(사무국장·홍보팀장 및 행정책임자의 직무)
# 제14조(회장 등의 직무대행), 제15조(직책자의 사임), 제16조(직책의 해임)
# 제19조(총회의 소집), 제20조(총회의 기능), 제21조(총회의 의결)
# 제22조(운영위원회의 구성), 제23조(운영위원회의 회의), 제25조(운영위원회의 의결)
# 제26조의1(분과위원회의 구성 및 운영), 제26조의2(구위원회의 구성 및 운영), 제26조의3(홍보팀의 구성 및 운영)
# 제27조(정책제안·모니터링 및 연도별 운영계획), 제27조의2(공식활동의 범위), 제27조의3(공식활동의 승인 및 지원), 제27조의4(활동결과보고의 원칙), 제27조의5(활동계획서 등의 서식과 행정책임)
# 제28조(선거관리위원회의 구성), 제29조(선거관리)
# 제30조(경비 및 자체 회비), 제30조의2(외부 후원금품 등의 접수 및 관리), 제31조(회계연도), 제32조(예산·결산 및 감사)
# 제33조(의사록 및 활동기록), 제34조(활동보고 및 자료보존), 제35조(자료제공), 제36조(회칙 외 운영기준)
# 부칙 (시행일, 경과조치, 임원체계 개편 및 임기 경과조치)

print("Starting custom structured extraction...")
