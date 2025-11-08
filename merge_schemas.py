import re

def merge_schemas():
    with open('/home/jorgem/Desktop/literacia/merged_schema.sql', 'r') as f:
        merged_schema = f.read()

    statements = merged_schema.split('--')
    
    final_schema = []
    created_tables = set()
    
    users_table_def = None

    for statement in statements:
        statement = statement.strip()
        if not statement:
            continue

        # Extract table name from CREATE TABLE statements
        create_table_match = re.search(r'CREATE TABLE public\.([a-zA-Z_]+)', statement, re.IGNORECASE)
        if create_table_match:
            table_name = create_table_match.group(1)
            if table_name == 'users':
                if users_table_def is None:
                    users_table_def = statement
                else:
                    # Merge columns
                    existing_cols = set(re.findall(r'^\s*([a-zA-Z_]+)', users_table_def, re.MULTILINE))
                    new_cols = re.findall(r'^\s*([a-zA-Z_]+)', statement, re.MULTILINE)
                    for col in new_cols:
                        if col not in existing_cols:
                            # Find the full column definition and add it
                            col_def_match = re.search(r'(^\s*{}\s+.*)'.format(re.escape(col)), statement, re.MULTILINE)
                            if col_def_match:
                                users_table_def = users_table_def.replace(');', ',\n' + col_def_match.group(1) + '\n);')
                continue # Skip adding the original users table definition

            if table_name not in created_tables:
                final_schema.append(statement)
                created_tables.add(table_name)
        else:
            final_schema.append(statement)

    if users_table_def:
        final_schema.append(users_table_def)

    with open('/home/jorgem/Desktop/literacia/final_schema.sql', 'w') as f:
        f.write('\n--\n'.join(final_schema))

if __name__ == '__main__':
    merge_schemas()
