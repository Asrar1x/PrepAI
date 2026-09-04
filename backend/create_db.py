import asyncio
import asyncpg

async def main():
    try:
        # Connect to the default 'postgres' database to create 'prepai'
        conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/postgres')
        # PostgreSQL cannot execute CREATE DATABASE inside a transaction block
        await conn.execute('CREATE DATABASE prepai')
        print("Database 'prepai' created successfully.")
        await conn.close()
    except asyncpg.exceptions.DuplicateDatabaseError:
        print("Database 'prepai' already exists.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
