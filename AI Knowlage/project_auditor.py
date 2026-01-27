"""
Project Auditor Toolkit
Готови за изпълнение Python скриптове за Meta-Architect+
"""

import os
import json
import yaml
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Optional, Set


# ============================================================================
# 1. PROJECT AUDITOR - Основен клас за сканиране на проекта
# ============================================================================

class ProjectAuditor:
    """
    Comprehensive project scanner for Meta-Architect+
    Анализира структурата, технологиите и потенциалните проблеми
    """
    
    def __init__(self, project_root: str = "./"):
        self.root = Path(project_root).resolve()
        self.findings = {
            "structure": {},
            "technologies": set(),
            "frameworks": [],
            "files_by_type": defaultdict(list),
            "potential_issues": [],
            "missing_components": [],
            "metrics": {
                "total_files": 0,
                "total_lines": 0,
                "code_files": 0
            }
        }
    
    def scan_directory_structure(self):
        """Сканира цялата директорна структура"""
        ignore_patterns = [
            "node_modules", ".git", "dist", "build", 
            "__pycache__", ".next", "venv", ".venv",
            "coverage", ".pytest_cache"
        ]
        
        for item in self.root.rglob("*"):
            # Skip ignored directories
            if any(pattern in str(item) for pattern in ignore_patterns):
                continue
                
            if item.is_file():
                suffix = item.suffix
                relative_path = item.relative_to(self.root)
                
                self.files_by_type[suffix].append(str(relative_path))
                self.findings["metrics"]["total_files"] += 1
                
                # Detect technologies from file extensions
                self._detect_tech_from_file(item)
                
                # Count lines of code
                if suffix in ['.py', '.js', '.ts', '.tsx', '.jsx', '.vue']:
                    self.findings["metrics"]["code_files"] += 1
                    try:
                        with open(item, 'r', encoding='utf-8') as f:
                            lines = len(f.readlines())
                            self.findings["metrics"]["total_lines"] += lines
                    except:
                        pass
    
    def _detect_tech_from_file(self, filepath: Path):
        """Detect technologies from file extensions and names"""
        suffix = filepath.suffix
        name = filepath.name
        
        tech_map = {
            ('.tsx', '.jsx'): 'React',
            ('.vue',): 'Vue.js',
            ('.svelte',): 'Svelte',
            ('.py',): 'Python',
            ('.java',): 'Java',
            ('.go',): 'Go',
            ('.rs',): 'Rust',
            ('.sql',): 'SQL Database',
        }
        
        for extensions, tech in tech_map.items():
            if suffix in extensions:
                self.findings["technologies"].add(tech)
        
        # Check special files
        if name == 'package.json':
            self.findings["technologies"].add('Node.js')
        elif name == 'requirements.txt':
            self.findings["technologies"].add('Python')
        elif name == 'Dockerfile':
            self.findings["technologies"].add('Docker')
        elif name == 'docker-compose.yml':
            self.findings["technologies"].add('Docker Compose')
        elif name == 'Cargo.toml':
            self.findings["technologies"].add('Rust')
    
    def detect_frameworks(self):
        """Detect frameworks from package.json and requirements.txt"""
        frameworks = []
        
        # Check package.json
        package_json = self.root / "package.json"
        if package_json.exists():
            try:
                with open(package_json, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    
                    framework_map = {
                        'next': 'Next.js',
                        'react': 'React',
                        'vue': 'Vue.js',
                        'svelte': 'Svelte',
                        '@angular/core': 'Angular',
                        'express': 'Express.js',
                        '@nestjs/core': 'NestJS',
                        'fastify': 'Fastify'
                    }
                    
                    for pkg, framework in framework_map.items():
                        if pkg in deps:
                            frameworks.append(framework)
            except:
                pass
        
        # Check requirements.txt
        requirements = self.root / "requirements.txt"
        if requirements.exists():
            try:
                with open(requirements, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                    
                    python_frameworks = {
                        'django': 'Django',
                        'fastapi': 'FastAPI',
                        'flask': 'Flask',
                        'tornado': 'Tornado',
                        'pyramid': 'Pyramid'
                    }
                    
                    for pkg, framework in python_frameworks.items():
                        if pkg in content:
                            frameworks.append(framework)
            except:
                pass
        
        self.findings["frameworks"] = list(set(frameworks))
    
    def check_configuration_files(self):
        """Check for presence of critical configuration files"""
        critical_configs = {
            "package.json": "Node.js package configuration",
            "requirements.txt": "Python dependencies",
            "tsconfig.json": "TypeScript configuration",
            ".env.example": "Environment variables template",
            "README.md": "Project documentation",
            ".gitignore": "Git ignore rules",
            "docker-compose.yml": "Docker orchestration",
            "Dockerfile": "Container definition",
            ".eslintrc": "Linting configuration",
            "pytest.ini": "Python test configuration",
            "jest.config.js": "Jest test configuration"
        }
        
        missing = []
        for filename, description in critical_configs.items():
            # Check multiple possible locations
            possible_paths = [
                self.root / filename,
                self.root / filename.replace('.js', '.json'),
                self.root / filename.replace('.js', '.ts')
            ]
            
            if not any(p.exists() for p in possible_paths):
                missing.append(f"{description} ({filename})")
        
        if missing:
            self.findings["missing_components"] = missing
    
    def analyze_code_quality(self):
        """Basic code quality analysis"""
        issues = []
        
        # Check for hardcoded credentials (primitive check)
        suspicious_patterns = [
            ('password', 'Possible hardcoded password'),
            ('api_key', 'Possible hardcoded API key'),
            ('secret', 'Possible hardcoded secret'),
            ('token', 'Possible hardcoded token')
        ]
        
        code_extensions = ['.py', '.js', '.ts', '.tsx', '.jsx']
        
        for ext in code_extensions:
            for file_path_str in self.files_by_type.get(ext, []):
                file_path = self.root / file_path_str
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Check for suspicious patterns
                        for pattern, description in suspicious_patterns:
                            if pattern in content.lower() and '=' in content:
                                # Avoid false positives from comments or strings
                                lines = content.split('\n')
                                for i, line in enumerate(lines, 1):
                                    if pattern in line.lower() and '=' in line:
                                        if not line.strip().startswith('#') and \
                                           not line.strip().startswith('//'):
                                            issues.append({
                                                "severity": "HIGH",
                                                "type": "security",
                                                "file": str(file_path_str),
                                                "line": i,
                                                "description": description
                                            })
                                            break
                        
                        # Check for TODO/FIXME
                        if 'TODO' in content or 'FIXME' in content:
                            count = content.count('TODO') + content.count('FIXME')
                            issues.append({
                                "severity": "MEDIUM",
                                "type": "technical_debt",
                                "file": str(file_path_str),
                                "description": f"{count} TODO/FIXME comments found"
                            })
                        
                        # Check for console.log (JavaScript/TypeScript)
                        if ext in ['.js', '.ts', '.tsx', '.jsx']:
                            if 'console.log' in content:
                                issues.append({
                                    "severity": "LOW",
                                    "type": "code_quality",
                                    "file": str(file_path_str),
                                    "description": "console.log statements found (should be removed in production)"
                                })
                        
                        # Check for print statements (Python)
                        if ext == '.py':
                            if '\nprint(' in content or content.startswith('print('):
                                issues.append({
                                    "severity": "LOW",
                                    "type": "code_quality",
                                    "file": str(file_path_str),
                                    "description": "print() statements found (consider using logging)"
                                })
                
                except Exception as e:
                    pass
        
        self.findings["potential_issues"] = issues
    
    def calculate_health_score(self) -> Dict[str, int]:
        """Calculate project health metrics"""
        scores = {
            "security": 100,
            "performance": 100,
            "code_quality": 100,
            "documentation": 100,
            "overall": 100
        }
        
        # Security score
        security_issues = [i for i in self.findings["potential_issues"] 
                          if i.get("type") == "security"]
        scores["security"] = max(0, 100 - (len(security_issues) * 20))
        
        # Code quality score
        quality_issues = [i for i in self.findings["potential_issues"] 
                         if i.get("type") == "code_quality"]
        scores["code_quality"] = max(0, 100 - (len(quality_issues) * 5))
        
        # Documentation score
        if not (self.root / "README.md").exists():
            scores["documentation"] -= 30
        if not (self.root / ".env.example").exists():
            scores["documentation"] -= 20
        
        # Overall score
        scores["overall"] = sum(scores.values()) // len(scores)
        
        return scores
    
    def generate_report(self) -> str:
        """Generate comprehensive audit report"""
        health = self.calculate_health_score()
        
        report = f"""
# 🔍 PROJECT AUDIT REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 Project Overview

**Location**: {self.root}

### Metrics:
- Total Files: {self.findings['metrics']['total_files']}
- Code Files: {self.findings['metrics']['code_files']}
- Total Lines of Code: {self.findings['metrics']['total_lines']:,}

### Technologies Detected:
{self._format_list(sorted(self.findings['technologies']))}

### Frameworks:
{self._format_list(self.findings['frameworks']) if self.findings['frameworks'] else '- No frameworks detected'}

## 📁 File Distribution

"""
        # File type breakdown
        for ext, files in sorted(self.findings['files_by_type'].items(), 
                                key=lambda x: len(x[1]), reverse=True)[:10]:
            ext_display = ext if ext else '(no extension)'
            report += f"- **{ext_display}**: {len(files)} files\n"
        
        report += f"""

## 🏥 Health Score: {health['overall']}/100

- 🔒 **Security**: {health['security']}/100 {self._get_emoji(health['security'])}
- ⚡ **Performance**: {health['performance']}/100 {self._get_emoji(health['performance'])}
- 📝 **Code Quality**: {health['code_quality']}/100 {self._get_emoji(health['code_quality'])}
- 📚 **Documentation**: {health['documentation']}/100 {self._get_emoji(health['documentation'])}

## ⚠️ Issues Found: {len(self.findings['potential_issues'])}

"""
        # Group issues by severity
        by_severity = defaultdict(list)
        for issue in self.findings['potential_issues']:
            by_severity[issue.get('severity', 'UNKNOWN')].append(issue)
        
        for severity in ['HIGH', 'MEDIUM', 'LOW']:
            if severity in by_severity:
                report += f"\n### {severity} Priority ({len(by_severity[severity])} issues)\n\n"
                for issue in by_severity[severity][:5]:  # Show top 5
                    report += f"- **{issue['file']}**: {issue['description']}\n"
                if len(by_severity[severity]) > 5:
                    report += f"  *(... and {len(by_severity[severity]) - 5} more)*\n"
        
        report += f"""

## ❌ Missing Components

{self._format_list(self.findings['missing_components']) if self.findings['missing_components'] else '✅ All critical components present'}

---
*Audit completed successfully*
"""
        return report
    
    def _format_list(self, items):
        """Format list items with bullet points"""
        if not items:
            return "- None"
        return '\n'.join(f"- {item}" for item in items)
    
    def _get_emoji(self, score: int) -> str:
        """Get emoji based on score"""
        if score >= 80:
            return "🟢"
        elif score >= 60:
            return "🟡"
        else:
            return "🔴"


# ============================================================================
# 2. GRAPH LIBRARIAN - Interface to Knowledge Graph
# ============================================================================

class GraphLibrarian:
    """
    Interface to knowledge_graph.json
    Based on Meta-Architect specification
    """
    
    def __init__(self, graph_path: str = "knowledge_graph.json"):
        self.graph_path = Path(graph_path)
        self._graph = self._load_graph()
    
    def _load_graph(self) -> Dict:
        """Load the graph with error handling"""
        try:
            with open(self.graph_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            raise RuntimeError(f"CRITICAL: Graph not found at {self.graph_path}")
        except json.JSONDecodeError as e:
            raise RuntimeError(f"CRITICAL: Graph JSON corrupted - {e}")
    
    def query_by_category(
        self,
        category: str,
        priority: int = 2,
        subcategory: Optional[str] = None
    ) -> List[Dict]:
        """Query nodes by category and optional subcategory"""
        results = []
        
        for node in self._graph.get("nodes", []):
            metadata = node.get("metadata", {})
            
            # Filter by category and priority
            if (metadata.get("category") == category and
                metadata.get("priority", 99) <= priority):
                
                # Optional subcategory filter
                if subcategory:
                    if metadata.get("sub_category") != subcategory:
                        continue
                
                results.append({
                    "id": node["id"],
                    "type": node["type"],
                    "url": metadata.get("access_url", ""),
                    "sub_category": metadata.get("sub_category", ""),
                    "priority": metadata.get("priority", 99)
                })
        
        return sorted(results, key=lambda x: x["priority"])
    
    def inject_context_package(
        self,
        agent_role: str,
        requirements: List[str]
    ) -> str:
        """Generate context injection for an agent"""
        role_category_map = {
            "frontend_specialist": "Programming Languages & Frameworks",
            "backend_specialist": "Programming Languages & Frameworks",
            "db_architect": "Databases & Data Infrastructure",
            "devops_engineer": "Cloud Platforms & DevOps",
            "ai_integrator": "AI Models & LLM Development"
        }
        
        category = role_category_map.get(agent_role)
        if not category:
            return f"ERROR: Unknown agent role '{agent_role}'"
        
        # Get relevant nodes
        all_nodes = self.query_by_category(category, priority=2)
        
        # Filter by requirements
        filtered = []
        for node in all_nodes:
            for req in requirements:
                req_lower = req.lower()
                if (req_lower in node["id"].lower() or
                    req_lower in node["sub_category"].lower()):
                    filtered.append(node)
                    break
        
        # Generate markdown injection
        injection = f"""# KNOWLEDGE INJECTION FOR: {agent_role.upper()}
## Active Context (Generated: {datetime.now().isoformat()})

### Relevant Resources ({len(filtered)} nodes)
"""
        for node in filtered:
            injection += f"""
#### {node['id']} (Priority {node['priority']})
- **Type**: {node['type']}
- **Category**: {node['sub_category']}
- **URL**: {node['url']}
"""
        
        injection += """

### AGENT RULES:
1. All architectural decisions MUST reference one of the above URLs
2. If information is missing, respond: "ESCALATION REQUIRED: Missing Graph data for [topic]"
3. Never invent API signatures, schemas, or configuration syntax
4. When in doubt, escalate to Meta-Architect
"""
        return injection


# ============================================================================
# 3. AGENT STATE MANAGER - Create and manage agent state files
# ============================================================================

class AgentStateManager:
    """Manage agent state files in YAML format"""
    
    def __init__(self, states_dir: str = "./agent_states"):
        self.states_dir = Path(states_dir)
        self.states_dir.mkdir(exist_ok=True)
    
    def create_agent_state(
        self,
        agent_id: str,
        role: str,
        capabilities: List[str],
        knowledge_context: str
    ) -> Path:
        """Create a new agent state file"""
        state = {
            "agent_id": agent_id,
            "role": role,
            "status": "READY",
            "current_task": None,
            "assigned_at": None,
            "knowledge_context": knowledge_context,
            "capabilities": capabilities,
            "restrictions": [
                "Cannot modify priority=1 Graph nodes without Meta-Architect approval",
                "Must reference Graph nodes for all architectural decisions",
                "Cannot directly access other agents' state files"
            ],
            "work_log": [],
            "escalations": [],
            "modified_files": []
        }
        
        filepath = self.states_dir / f"{role}.yml"
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(state, f, default_flow_style=False, allow_unicode=True)
        
        return filepath
    
    def load_agent_state(self, role: str) -> Optional[Dict]:
        """Load an agent's state file"""
        filepath = self.states_dir / f"{role}.yml"
        if not filepath.exists():
            return None
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def update_agent_status(self, role: str, status: str, task: Optional[str] = None):
        """Update agent's status"""
        state = self.load_agent_state(role)
        if state:
            state["status"] = status
            if task:
                state["current_task"] = task
                state["assigned_at"] = datetime.now().isoformat()
            
            filepath = self.states_dir / f"{role}.yml"
            with open(filepath, 'w', encoding='utf-8') as f:
                yaml.dump(state, f, default_flow_style=False, allow_unicode=True)


# ============================================================================
# 4. REMEDIATION PLANNER - Generate action plans
# ============================================================================

class RemediationPlanner:
    """Generate structured remediation plans"""
    
    def __init__(self, audit_findings: Dict):
        self.findings = audit_findings
    
    def categorize_issues(self) -> Dict[str, List[Dict]]:
        """Categorize issues by severity"""
        categorized = {
            "CRITICAL": [],
            "HIGH": [],
            "MEDIUM": [],
            "LOW": []
        }
        
        for issue in self.findings.get("potential_issues", []):
            severity = issue.get("severity", "MEDIUM")
            categorized[severity].append(issue)
        
        return categorized
    
    def generate_plan(self, project_name: str = "Unnamed Project") -> Dict:
        """Generate comprehensive remediation plan"""
        categorized = self.categorize_issues()
        
        plan = {
            "project_name": project_name,
            "audit_date": datetime.now().isoformat(),
            "total_issues": sum(len(issues) for issues in categorized.values()),
            "breakdown": {k.lower(): len(v) for k, v in categorized.items()},
            "phases": []
        }
        
        # Phase 1: Critical
        if categorized["CRITICAL"]:
            plan["phases"].append({
                "phase": 1,
                "name": "Critical Issues Resolution",
                "duration_estimate": "3-5 days",
                "priority": "IMMEDIATE",
                "issues": self._format_issues_for_phase(categorized["CRITICAL"])
            })
        
        # Phase 2: High
        if categorized["HIGH"]:
            plan["phases"].append({
                "phase": 2 if categorized["CRITICAL"] else 1,
                "name": "High Priority Fixes",
                "duration_estimate": "1-2 weeks",
                "priority": "URGENT",
                "issues": self._format_issues_for_phase(categorized["HIGH"])
            })
        
        # Phase 3: Medium
        if categorized["MEDIUM"]:
            phase_num = len(plan["phases"]) + 1
            plan["phases"].append({
                "phase": phase_num,
                "name": "Technical Debt & Code Quality",
                "duration_estimate": "2-3 weeks",
                "priority": "IMPORTANT",
                "issues": self._format_issues_for_phase(categorized["MEDIUM"])
            })
        
        # Phase 4: Low
        if categorized["LOW"]:
            phase_num = len(plan["phases"]) + 1
            plan["phases"].append({
                "phase": phase_num,
                "name": "Optimizations & Polish",
                "duration_estimate": "1 week",
                "priority": "OPTIONAL",
                "issues": self._format_issues_for_phase(categorized["LOW"])
            })
        
        return plan
    
    def _format_issues_for_phase(self, issues: List[Dict]) -> List[Dict]:
        """Format issues for plan output"""
        formatted = []
        for i, issue in enumerate(issues, 1):
            formatted.append({
                "id": f"{issue['severity']}-{i:03d}",
                "description": issue['description'],
                "file": issue.get('file', 'N/A'),
                "assigned_to": self._assign_agent(issue),
                "status": "PENDING"
            })
        return formatted
    
    def _assign_agent(self, issue: Dict) -> str:
        """Assign appropriate agent based on issue type"""
        file = issue.get('file', '')
        
        if any(ext in file for ext in ['.tsx', '.jsx', '.css', '.html']):
            return "frontend_specialist"
        elif any(ext in file for ext in ['.py', '.js', '.ts']) and 'api' in file.lower():
            return "backend_specialist"
        elif '.sql' in file or 'migration' in file.lower():
            return "db_architect"
        elif 'docker' in file.lower() or 'deploy' in file.lower():
            return "devops_engineer"
        else:
            return "backend_specialist"  # Default


# ============================================================================
# MAIN EXECUTION SCRIPT
# ============================================================================

def main():
    """Main execution function"""
    print("🚀 Meta-Architect+ Project Auditor")
    print("=" * 60)
    
    # Step 1: Audit the project
    print("\n📊 Step 1: Auditing project structure...")
    auditor = ProjectAuditor("./")
    auditor.scan_directory_structure()
    auditor.detect_frameworks()
    auditor.check_configuration_files()
    auditor.analyze_code_quality()
    
    # Generate audit report
    report = auditor.generate_report()
    print(report)
    
    # Save report
    with open("audit_report.md", "w", encoding="utf-8") as f:
        f.write(report)
    print("\n💾 Audit report saved to: audit_report.md")
    
    # Step 2: Load Knowledge Graph
    print("\n📚 Step 2: Loading Knowledge Graph...")
    try:
        librarian = GraphLibrarian("knowledge_graph.json")
        print("✅ Knowledge Graph loaded successfully")
    except Exception as e:
        print(f"⚠️ Warning: {e}")
        return
    
    # Step 3: Determine required agents
    print("\n🤖 Step 3: Determining required agents...")
    required_agents = []
    
    if auditor.findings["technologies"]:
        techs = auditor.findings["technologies"]
        
        if any(t in techs for t in ['React', 'Vue.js', 'Svelte']):
            required_agents.append(("frontend_specialist", ["react", "typescript"]))
        
        if 'Python' in techs or 'Node.js' in techs:
            required_agents.append(("backend_specialist", ["python", "nodejs", "api"]))
        
        if 'SQL Database' in techs:
            required_agents.append(("db_architect", ["postgresql", "sql"]))
        
        if 'Docker' in techs or 'Docker Compose' in techs:
            required_agents.append(("devops_engineer", ["docker", "kubernetes"]))
    
    print(f"📋 Required agents: {len(required_agents)}")
    for agent, _ in required_agents:
        print(f"  - {agent}")
    
    # Step 4: Create agent states
    print("\n🔧 Step 4: Creating agent state files...")
    agent_manager = AgentStateManager()
    
    for agent_role, requirements in required_agents:
        # Generate context injection
        context = librarian.inject_context_package(agent_role, requirements)
        
        # Define capabilities
        capabilities_map = {
            "frontend_specialist": [
                "React component development",
                "TypeScript type definitions",
                "CSS/Tailwind styling",
                "Frontend testing"
            ],
            "backend_specialist": [
                "API design and implementation",
                "Authentication & authorization",
                "Business logic",
                "Backend testing"
            ],
            "db_architect": [
                "Schema design",
                "Query optimization",
                "Migration management",
                "Data integrity"
            ],
            "devops_engineer": [
                "Container orchestration",
                "CI/CD setup",
                "Monitoring & logging",
                "Infrastructure as Code"
            ]
        }
        
        capabilities = capabilities_map.get(agent_role, [])
        agent_id = f"{agent_role}_001"
        
        filepath = agent_manager.create_agent_state(
            agent_id=agent_id,
            role=agent_role,
            capabilities=capabilities,
            knowledge_context=context
        )
        print(f"  ✅ Created: {filepath}")
    
    # Step 5: Generate remediation plan
    print("\n📋 Step 5: Generating remediation plan...")
    planner = RemediationPlanner(auditor.findings)
    plan = planner.generate_plan(project_name=Path(".").resolve().name)
    
    # Save plan
    with open("remediation_plan.yml", "w", encoding="utf-8") as f:
        yaml.dump(plan, f, default_flow_style=False, allow_unicode=True)
    print("💾 Remediation plan saved to: remediation_plan.yml")
    
    # Print summary
    print("\n" + "=" * 60)
    print("✅ AUDIT COMPLETE")
    print("=" * 60)
    print(f"\n📊 Summary:")
    print(f"  - Total issues found: {plan['total_issues']}")
    print(f"  - Critical: {plan['breakdown']['critical']}")
    print(f"  - High: {plan['breakdown']['high']}")
    print(f"  - Medium: {plan['breakdown']['medium']}")
    print(f"  - Low: {plan['breakdown']['low']}")
    print(f"\n  - Agents created: {len(required_agents)}")
    print(f"  - Remediation phases: {len(plan['phases'])}")
    
    print("\n📁 Generated files:")
    print("  - audit_report.md")
    print("  - remediation_plan.yml")
    print("  - agent_states/*.yml")
    
    print("\n🚀 Next steps:")
    print("  1. Review audit_report.md")
    print("  2. Review remediation_plan.yml")
    print("  3. Approve plan and begin Phase 1")


if __name__ == "__main__":
    main()
