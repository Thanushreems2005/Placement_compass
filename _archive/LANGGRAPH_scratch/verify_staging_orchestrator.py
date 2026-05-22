import asyncio
import logging
import os
import json
from LANGGRAPH.services.staging_orchestrator import StagingParametersOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    orchestrator = StagingParametersOrchestrator()
    connected = await orchestrator.connect_staging_parameters_to_keywords()
    
    if not connected:
        logger.error("Failed to connect staging parameters to orchestration keywords.")
        return
        
    logger.info(f"Successfully mapped {len(connected)} parameters from staging_company!")
    
    # Let's count mappings per section
    section_counts = {}
    for param, info in connected.items():
        sec = info["section"]
        section_counts[sec] = section_counts.get(sec, 0) + 1
        
    logger.info("Parameters per Section:")
    for sec, count in section_counts.items():
        logger.info(f"  {sec}: {count} parameters")
        
    # Write a beautiful markdown report as an artifact
    artifact_dir = r"C:\Users\thanu\.gemini\antigravity\brain\b407493e-ab4e-4165-a657-7211431a0d7c"
    os.makedirs(artifact_dir, exist_ok=True)
    report_path = os.path.join(artifact_dir, "staging_parameter_orchestration_report.md")
    
    md_content = []
    md_content.append("# Staging Parameter Orchestration Mapping")
    md_content.append("")
    md_content.append("> [!NOTE]")
    md_content.append("> This report documents the mapping of parameters (columns) from the 1st row of the staging company table (`staging_company`)")
    md_content.append("> on the secondary Supabase database, successfully connecting them to the target orchestration search query keywords.")
    md_content.append("")
    md_content.append("## Staging Company Summary")
    md_content.append(f"- **Company Retrieved**: Seagate Technology")
    md_content.append(f"- **Total Parameters Mapped**: {len(connected)} parameters")
    md_content.append("")
    md_content.append("### Parameters by Section")
    md_content.append("| Section Name | Parameter Count | Orchestration Query Template |")
    md_content.append("| :--- | :--- | :--- |")
    for sec, count in sorted(section_counts.items()):
        q = orchestrator.search_queries.get(sec, "N/A")
        md_content.append(f"| `{sec}` | {count} | `{q}` |")
    md_content.append("")
    md_content.append("## Detailed Parameter-to-Keyword Mapping")
    md_content.append("Below are the first 30 connected parameters mapped to their target query templates and sample values:")
    md_content.append("")
    md_content.append("| Parameter | Section | Query Keywords | Has Staging Value? |")
    md_content.append("| :--- | :--- | :--- | :--- |")
    
    for i, (param, info) in enumerate(sorted(connected.items())):
        if i >= 40:
            break
        val_status = "✅ YES" if info["has_valid_staging_value"] else "❌ NO"
        md_content.append(f"| `{param}` | `{info['section']}` | `{info['query_template']}` | {val_status} |")
        
    md_content.append("")
    md_content.append("... and more parameters mapped dynamically.")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_content))
        
    logger.info(f"Successfully generated beautiful orchestration report at: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
