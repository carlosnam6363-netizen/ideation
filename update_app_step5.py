import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace or add toggleMcpListDetails, loadProposal, exportToHWP, exportToDOCX, copyProposalToClipboard

new_methods = '''    // Step 3: 세부 정책 목록 열기/닫기 토글
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

    // Step 5: 정책 제안서 5선 렌더링 및 서식 로드
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
                        <span class="text-xs text-slate-500 font-medium truncate max-w-[140px]">${p.field}</span>
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

    // 한글(HWP) 파일로 추출 및 다운로드
    exportToHWP() {
        const data = this.getProposalFormData();
        const safeTitle = data.title.replace(/[\\/\\\\:*?"<>|]/g, "_");

        const hwpHTML = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${data.title}</title>
<style>
  body { font-family: '맑은 고딕', 'Malgun Gothic', '한컴바탕', Batang, sans-serif; font-size: 11pt; line-height: 1.6; }
  h1 { text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 25px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1pt solid #000000; padding: 8pt 10pt; font-size: 11pt; vertical-align: middle; }
  th { background-color: #F1F5F9; font-weight: bold; text-align: center; width: 130px; }
  .section-hdr { background-color: #F8FAFC; font-weight: bold; text-align: center; vertical-align: middle; }
  .sub-hdr { font-weight: bold; color: #1E3A8A; margin-bottom: 4pt; }
  .content-text { white-space: pre-wrap; font-size: 10.5pt; color: #1E293B; }
  .footer { text-align: right; margin-top: 25px; font-size: 11pt; font-weight: bold; }
</style>
</head>
<body>
  <h1>화성시 청년정책협의체 정책 제안서</h1>
  <table>
    <tr>
      <th>분 과 명</th>
      <td colspan="2"><div class="content-text">${data.division}</div></td>
    </tr>
    <tr>
      <th>제 안 명</th>
      <td colspan="2"><div class="content-text" style="font-weight: bold; font-size: 13pt; color: #1E40AF;">${data.title}</div></td>
    </tr>
    <tr>
      <th>추진근거</th>
      <td colspan="2"><div class="content-text">${data.basis}</div></td>
    </tr>
    <tr>
      <th>참고정책</th>
      <td colspan="2"><div class="content-text">${data.refPolicy}</div></td>
    </tr>
    <tr>
      <th rowspan="2">제안배경<br>및<br>필요성</th>
      <th style="width: 120px; background-color: #FFF1F2; color: #9F1239;">현황과 문제점</th>
      <td><div class="content-text">${data.problems}</div></td>
    </tr>
    <tr>
      <th style="width: 120px; background-color: #EFF6FF; color: #1E40AF;">개선방안</th>
      <td><div class="content-text">${data.solutions}</div></td>
    </tr>
    <tr>
      <th>제안내용</th>
      <td colspan="2"><div class="content-text">${data.details}</div></td>
    </tr>
    <tr>
      <th>기대효과</th>
      <td colspan="2"><div class="content-text">${data.effects}</div></td>
    </tr>
  </table>
  <div class="footer">
    화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동
  </div>
</body>
</html>`;

        const blob = new Blob(["\\ufeff" + hwpHTML], { type: "application/x-hwp;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeTitle}.hwp`;
        link.click();
        alert(`한글(HWP) 파일이 성공적으로 다운로드되었습니다!\\n한컴오피스 한글에서 완벽한 표 서식으로 열립니다.`);
    },

    // 워드(DOCX) 파일로 추출 및 다운로드
    exportToDOCX() {
        const data = this.getProposalFormData();
        const safeTitle = data.title.replace(/[\\/\\\\:*?"<>|]/g, "_");

        const docxHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${data.title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 21.0cm 29.7cm; margin: 2.5cm 2.0cm 2.0cm 2.0cm; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
  h1 { text-align: center; font-size: 21pt; font-weight: bold; margin-bottom: 25pt; letter-spacing: -0.5pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 15pt; }
  th, td { border: 1.5pt solid #000000; padding: 10pt; font-size: 11pt; vertical-align: middle; }
  th { background-color: #F1F5F9; font-weight: bold; text-align: center; width: 130px; }
  .content-box { white-space: pre-wrap; font-size: 10.5pt; }
  .footer { text-align: right; margin-top: 30pt; font-size: 12pt; font-weight: bold; }
</style>
</head>
<body>
  <h1>화성시 청년정책협의체 정책 제안서</h1>
  <table>
    <tr>
      <th>분 과 명</th>
      <td colspan="2"><div class="content-box">${data.division}</div></td>
    </tr>
    <tr>
      <th>제 안 명</th>
      <td colspan="2"><div class="content-box" style="font-weight: bold; font-size: 13pt; color: #1E40AF;">${data.title}</div></td>
    </tr>
    <tr>
      <th>추진근거</th>
      <td colspan="2"><div class="content-box">${data.basis}</div></td>
    </tr>
    <tr>
      <th>참고정책</th>
      <td colspan="2"><div class="content-box">${data.refPolicy}</div></td>
    </tr>
    <tr>
      <th rowspan="2">제안배경<br>및<br>필요성</th>
      <th style="width: 120px; background-color: #FFF1F2; color: #9F1239;">현황과 문제점</th>
      <td><div class="content-box">${data.problems}</div></td>
    </tr>
    <tr>
      <th style="width: 120px; background-color: #EFF6FF; color: #1E40AF;">개선방안</th>
      <td><div class="content-box">${data.solutions}</div></td>
    </tr>
    <tr>
      <th>제안내용</th>
      <td colspan="2"><div class="content-box">${data.details}</div></td>
    </tr>
    <tr>
      <th>기대효과</th>
      <td colspan="2"><div class="content-box">${data.effects}</div></td>
    </tr>
  </table>
  <div class="footer">
    화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 위원 일동
  </div>
</body>
</html>`;

        const blob = new Blob(["\\ufeff" + docxHTML], { type: "application/msword;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeTitle}.doc`;
        link.click();
        alert(`워드(DOCX) 호환 문서가 성공적으로 다운로드되었습니다!\\nMS Word 및 한글 오피스에서 완벽하게 표 양식이 유지됩니다.`);
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
            alert("공식 양식에 맞춘 정책제안서 전문이 클립보드에 복사되었습니다!\\n한글 또는 워드에 바로 붙여넣기 하실 수 있습니다.");
        }).catch(() => {
            alert("클립보드 복사에 실패했습니다. 텍스트를 직접 복사해주세요.");
        });
    },

    downloadProposalTxt() {
        const data = this.getProposalFormData();
        const safeTitle = data.title.replace(/[\\/\\\\:*?"<>|]/g, "_");
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
        const blob = new Blob(["\\ufeff" + text], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `[화성시_정책제안서]_${safeTitle}.txt`;
        link.click();
    },

    printProposal() {
        window.print();
    },
'''

# Replace old Step 5 methods in app.js
# Old methods: renderProposalSelector() ... printProposal()
pattern = re.compile(r'// Step 5: 정책 제안서 5선 렌더링 및 에디터 로드\s*renderProposalSelector\(\) \{.*?printProposal\(\) \{.*?\},', re.DOTALL)
if pattern.search(code):
    code = pattern.sub(lambda m: new_methods.strip(), code)
    print("Replaced Step 5 methods via regex!")
else:
    # If not matched, try searching for renderProposalSelector
    start_pos = code.find("renderProposalSelector() {")
    end_pos = code.find("// ==========================================\n    // 4. 탭 3: 회칙 정리")
    if start_pos != -1 and end_pos != -1:
        code = code[:start_pos] + new_methods.strip() + "\n\n" + code[end_pos:]
        print("Replaced Step 5 methods via position slice!")
    else:
        print("Could not find old Step 5 methods location.")

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved updated js/app.js successfully!")
