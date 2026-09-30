import re
import json

with open('hwpx_extracted.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect the sections and build a comprehensive list of comparison articles
# We will create an array of objects:
# {
#   id: "art-X",
#   chapter: "제X장 ...",
#   title: "제X조(...)",
#   changeType: "전면 개정" | "일부 개정" | "조항 신설" | "현행 유지",
#   isImportant: bool,
#   summary: "한줄 핵심 변경 내용",
#   current: "기존 내용(현행 조문)",
#   revised: "변경 내용(개정안)",
#   reason: "개정 사유 및 법령 근거"
# }

# We will carefully parse the sections from hwpx_extracted.txt
