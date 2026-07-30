with open('diff_history_utf8.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_func = False
extracted = []
for line in lines:
    if line.startswith('+function DashboardSimulator'):
        in_func = True
    
    if in_func:
        if line.startswith('+'):
            extracted.append(line[1:])
        elif line.startswith(' '):
            extracted.append(line[1:])
            
        if line.startswith('+}') or line.startswith(' }'):
            break

with open('clean_dashboard.jsx', 'w', encoding='utf-8') as f:
    f.writelines(extracted)
