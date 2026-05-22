import importlib, os, sys
sys.path.insert(0, os.getcwd())
try:
    workflow = importlib.import_module('LANGGRAPH.graph.workflow')
    has_app = hasattr(workflow, 'app')
    has_ainvoke = False
    if has_app:
        has_ainvoke = hasattr(workflow.app, 'ainvoke')
    print('IMPORT_OK', has_app, has_ainvoke)
except Exception as e:
    print('IMPORT_ERR', str(e))
