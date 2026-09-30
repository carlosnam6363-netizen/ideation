import re
import json

with open('hwpx_extracted.txt', 'r', encoding='utf-8') as f:
    raw_lines = [line.strip() for line in f.readlines() if line.strip()]

# Let's inspect the entire structure and create rich comparison data
# Key chapters:
# 제1장 총칙
# 제2장 위원
# 제3장 임원 및 운영직
# 제4장 총회
# 제5장 운영위원회
# 제6장 위원회 운영 (분과위원회, 구위원회, 홍보팀, 공식활동)
# 제8장 경비 및 회계
# 제9장 보칙
# 부칙

# We will build a structured array of articles:
# {
#   id: "art-1",
#   chapter: "제1장 총칙",
#   articleNum: "제2조",
#   title: "제2조(목적)",
#   tag: "거버넌스 파트너 명시",
#   isNew: false,
#   current: "...",
#   revised: "...",
#   reason: "..."
# }

# Let's write a python script to parse out each article with its Current, Revised, and Reason.

content = '\n'.join(raw_lines)

# Split by articles
article_pattern = re.compile(r'(제\d+조(?:의\d+)?\([^)]+\))')
# Let's inspect where these patterns appear
matches = list(article_pattern.finditer(content))
print(f"Total article occurrences found: {len(matches)}")
