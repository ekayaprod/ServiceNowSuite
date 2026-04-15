with open('ticket_template.html', 'r') as f:
    content = f.read()

content = content.replace('                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">', '                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">')

with open('ticket_template.html', 'w') as f:
    f.write(content)
