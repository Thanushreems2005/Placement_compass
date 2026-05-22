import os
keys = ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_URL','SUPABASE_ANON_KEY']
for k in keys:
    v = os.getenv(k)
    print(k, 'SET' if v else 'MISSING')
# Check package import
try:
    import supabase
    print('SUPABASE_PKG', 'OK')
except Exception as e:
    print('SUPABASE_PKG', 'ERR', str(e))
