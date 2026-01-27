
import json
import sys
import os

# Add Temp to path
sys.path.append(os.path.abspath('Temp'))

try:
    from kg_helper import KnowledgeGraph
except ImportError:
    # If it's not in the same dir, we'll try to read it directly
    with open('Temp/kg_helper.py', 'r') as f:
        exec(f.read())

def generate_markdown_section(kg):
    output = ""
    priority_label = {1: "⭐ Critical", 2: "🔥 High", 3: "📘 Medium", 4: "📄 Low"}
    
    # Sort categories to be stable
    categories = sorted(kg.categories.keys())
    
    for category in categories:
        output += f"\n## {category} Best Practices\n\n"
        
        # Group by sub-category
        sub_cats = {}
        for res in kg.categories[category]:
            if res.sub_category not in sub_cats:
                sub_cats[res.sub_category] = []
            sub_cats[res.sub_category].append(res)
            
        for sub_cat in sorted(sub_cats.keys()):
            output += f"### {sub_cat}\n\n"
            for res in sorted(sub_cats[sub_cat], key=lambda x: x.priority):
                output += f"#### ✅ {res.id.replace('-', ' ').title()}\n\n"
                output += f"**Type:** {res.type}  \n"
                output += f"**Priority:** {priority_label.get(res.priority, 'Unknown')}  \n"
                output += f"**Reference:** [{res.id}]({res.access_url})\n\n"
                
                # Add connections if any as related docs
                if res.connections:
                    output += "**Related Documentation:**\n"
                    for conn in res.connections:
                        output += f"- `{conn}`\n"
                    output += "\n"
        
        output += "---\n"
    return output

if __name__ == "__main__":
    with open('Temp/knowledge_graph_ex.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    kg = KnowledgeGraph(graph_data)
    md = generate_markdown_section(kg)
    print(md)
