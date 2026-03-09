#!/usr/bin/env python3
import json
import argparse
import sys
from pathlib import Path

# Resolve paths relative to this script location (.agent/tools/graph.py)
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_GRAPH_PATH = BASE_DIR / "context" / "ProjectGraph.json"
KNOWLEDGE_GRAPH_PATH = BASE_DIR / "context" / "knowledge_graph.json"

def load_graph(graph_type):
    path = PROJECT_GRAPH_PATH if graph_type == "project" else KNOWLEDGE_GRAPH_PATH
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), path
    except Exception as e:
        print(f"Error loading {graph_type} graph at {path}: {e}", file=sys.stderr)
        sys.exit(1)

def save_graph(data, path):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
    except Exception as e:
        print(f"Error saving to {path}: {e}", file=sys.stderr)
        sys.exit(1)

def cmd_search(args):
    data, _ = load_graph(args.graph)
    query = args.query.lower()
    results = []
    
    for node in data.get("nodes", []):
        # Dump node to string to search across all keys and values
        if query in json.dumps(node).lower():
            results.append(node)
            
    if not results:
        print(f"No matches found for '{query}' in {args.graph} graph.")
        return
        
    print(f"--- Found {len(results)} matches in {args.graph} graph ---")
    print(json.dumps(results, indent=2))

def cmd_add(args):
    data, path = load_graph(args.graph)
    nodes = data.get("nodes", [])
    
    # Check if a node with this ID already exists
    for n in nodes:
        if n.get("id") == args.id:
            print(f"Error: Node with id '{args.id}' already exists. Please edit it manually or use update (if implemented).", file=sys.stderr)
            sys.exit(1)
            
    # the new node
    new_node = {"id": args.id}
    
    if args.graph == "project":
        new_node["workspace"] = args.workspace or "root"
        new_node["type"] = args.type or "module"
        new_node["responsibility"] = args.desc or ""
        new_node["dependencies"] = json.loads(args.deps) if args.deps else []
        new_node["dependents"] = []
        new_node["status"] = "active"
    else:
        new_node["category"] = args.category or "Uncategorized"
        new_node["title"] = args.title or args.id
        new_node["description"] = args.desc or ""
        if args.tags: 
            new_node["tags"] = json.loads(args.tags)
        
    nodes.append(new_node)
    
    # Update timestamp
    import datetime
    timestamp_key = "generated_at" if args.graph == "project" else "last_updated"
    if "metadata" not in data:
        data["metadata"] = {}
    data["metadata"][timestamp_key] = datetime.datetime.utcnow().isoformat() + "Z"
    
    save_graph(data, path)
    print(f"Successfully added node '{args.id}' to {args.graph} graph.")
    print(json.dumps(new_node, indent=2))

def main():
    parser = argparse.ArgumentParser(description="BrainBox Agent Graph Manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    subparsers.required = True
    
    # Command: search
    parser_search = subparsers.add_parser("search", help="Search nodes in a graph")
    parser_search.add_argument("--graph", choices=["project", "knowledge"], required=True, help="Which graph to search")
    parser_search.add_argument("query", help="Text to search for (case insensitive)")
    
    # Command: add
    parser_add = subparsers.add_parser("add", help="Add a new node to a graph")
    parser_add.add_argument("--graph", choices=["project", "knowledge"], required=True, help="Which graph to modify")
    parser_add.add_argument("--id", required=True, help="Unique Node ID (e.g. file path or concept name)")
    parser_add.add_argument("--desc", required=True, help="Description or responsibility of the node")
    
    # Project-graph specific arguments
    parser_add.add_argument("--type", help="Node type (e.g. module, config, documentation)")
    parser_add.add_argument("--workspace", help="Workspace (e.g. extension, dashboard, root)")
    parser_add.add_argument("--deps", help="Dependencies as a JSON array string (e.g. '[\"fileA\", \"fileB\"]')")
    
    # Knowledge-graph specific arguments
    parser_add.add_argument("--category", help="Category (e.g. External Documentation, Business Logic)")
    parser_add.add_argument("--title", help="Human-readable title")
    parser_add.add_argument("--tags", help="Tags as a JSON array string")
    
    args = parser.parse_args()
    
    if args.command == "search":
        cmd_search(args)
    elif args.command == "add":
        cmd_add(args)

if __name__ == "__main__":
    main()
