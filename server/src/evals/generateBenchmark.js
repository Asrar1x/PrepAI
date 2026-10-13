/**
 * Benchmark Dataset Generator
 * Generates 120 comprehensive evaluation scenarios satisfying all 9 mandatory categories:
 * - 20 Correct answers
 * - 20 Partially correct answers
 * - 20 Incorrect answers
 * - 10 Irrelevant answers
 * - 10 Vague/evasive answers
 * - 10 Hallucinated technical claims
 * - 10 Excellent expert answers
 * - 10 Short but correct answers
 * - 10 Long but incorrect answers
 */

const fs = require('fs');
const path = require('path');

const topics = [
  {
    topic: 'Database Systems & SQL',
    question: 'How do composite B-tree indexes work in relational databases, and what happens when you query without the leading indexed column?',
    expectedConcepts: ['b-tree', 'column sequence', 'leftmost prefix', 'index seek', 'full table scan', 'o(log n)'],
    referenceAnswer: 'Composite B-tree indexes order rows hierarchically by leading columns. Omitting the leftmost column prevents index seek traversal and forces an O(N) full index scan or table scan.'
  },
  {
    topic: 'System Design & Distributed Caching',
    question: 'How do you design a high-throughput caching layer for a high-volume REST API and mitigate cache stampedes?',
    expectedConcepts: ['redis', 'ttl', 'cache stampede', 'mutex', 'lru', 'write-behind', 'probabilistic early expiration'],
    referenceAnswer: 'Deploy a distributed Redis cluster using consistent hashing. Prevent cache stampedes with probabilistic early expiration (XFetch) or distributed mutex locking (Redlock).'
  },
  {
    topic: 'Concurrency & Multithreading',
    question: 'What is a race condition in a multi-threaded web application, and how do you resolve it when updating a shared bank account balance?',
    expectedConcepts: ['race condition', 'mutex', 'atomic', 'optimistic locking', 'pessimistic locking', 'select for update'],
    referenceAnswer: 'A race condition occurs when concurrent threads execute non-atomic read-modify-write cycles on shared state. Resolve with database row locking (SELECT ... FOR UPDATE) or optimistic versioning.'
  },
  {
    topic: 'Data Structures & Algorithms',
    question: 'Explain how a Hash Map handles hash collisions internally and what the worst-case runtime complexity is.',
    expectedConcepts: ['hash function', 'collision', 'chaining', 'open addressing', 'treeification', 'o(1)', 'o(n)'],
    referenceAnswer: 'Hash collisions are handled via separate chaining (linked lists or red-black trees in Java 8) or open addressing. Worst-case lookup is O(N) or O(log N) if bucket treeified.'
  },
  {
    topic: 'Operating Systems & Networking',
    question: 'What is the difference between a Process and a Thread, and what happens during an operating system context switch?',
    expectedConcepts: ['process', 'thread', 'virtual memory', 'address space', 'pcb', 'tcb', 'registers', 'cache flush'],
    referenceAnswer: 'A process has its own isolated virtual address space, while threads share memory within the same process. Context switching between processes flushes TLB/cache and switches page tables via PCB, whereas thread switching only restores TCB registers.'
  },
  {
    topic: 'Microservices & Distributed Systems',
    question: 'How do you maintain data consistency across distributed microservices without distributed two-phase commit transactions?',
    expectedConcepts: ['saga pattern', 'choreography', 'orchestration', 'compensating transaction', 'eventual consistency', 'idempotency'],
    referenceAnswer: 'Use the Saga pattern with compensating transactions coordinated either through event choreography (Kafka) or central orchestration, ensuring eventual consistency and idempotency.'
  }
];

const dataset = [];
let idCounter = 1;

function addExample(category, topicIdx, candidateAnswer, expertLabel, expertScore, acceptableRange) {
  const t = topics[topicIdx % topics.length];
  dataset.push({
    id: `eval-${String(idCounter++).padStart(3, '0')}`,
    category,
    topic: t.topic,
    question: t.question,
    expectedConcepts: t.expectedConcepts,
    referenceAnswer: t.referenceAnswer,
    candidateAnswer,
    expertLabel,
    expertScore,
    acceptableRange
  });
}

// 1. 10 Excellent Expert Answers (score 90-98, label: Pass)
const expertAnswers = [
  "Composite B-tree indexes order rows hierarchically based on the leftmost prefix rule. If a query filters on created_at without specifying tenant_id, the database engine cannot traverse the root-to-leaf search tree efficiently and must fall back from an O(log N) index seek to an O(N) index scan, degrading query throughput significantly.",
  "To handle high throughput and avoid hitting the primary database, we deploy a distributed Redis cluster using consistent hashing. To prevent cache stampede when keys expire, we implement probabilistic early expiration or distributed locking via Redlock with an LRU eviction policy.",
  "A race condition occurs when concurrent threads execute non-atomic read-modify-write cycles on shared state, causing lost updates. For a bank balance, we resolve this either via database-level pessimistic row locking using 'SELECT ... FOR UPDATE' inside a transactional boundary, or via optimistic concurrency control using a version column, ensuring atomic rollback on concurrent version mismatch.",
  "A hash map uses a hash function to map keys to bucket indices in O(1) average time. When collisions occur, separate chaining stores entries in buckets; in Java 8+, buckets treeify into Red-Black trees when size exceeds 8, improving worst-case search from O(N) to O(log N).",
  "A process is an isolated execution environment with dedicated virtual address space and PCB, whereas threads share the heap and code segment within a process. An OS context switch saves CPU register states and program counters to the PCB/TCB; inter-process switching incurs a TLB cache flush, whereas intra-process thread switching is significantly lighter.",
  "We maintain cross-service consistency using the Saga pattern with compensating transactions. In choreography, each service publishes domain events via Kafka; if an inventory reservation fails, compensating refund events are triggered asynchronously to enforce eventual consistency.",
  "In composite indexing, B-trees structure data by the exact column sequence defined in the DDL. Omitting the leading column prevents binary tree seeks, forcing sequential index page scans. Covering indexes can mitigate this by including all projected columns in the index leaf nodes.",
  "We build a resilient caching architecture using Redis with write-behind persistence. To mitigate stampedes, we apply probabilistic early expiration (XFetch algorithm) combined with background thread refreshes, keeping cache hit ratios above 98% with bounded memory eviction.",
  "To prevent concurrent balance deductions, we enforce serializable transaction isolation or optimistic locking with a version column (UPDATE account SET balance = balance - amount, version = version + 1 WHERE id = ? AND version = ?). If zero rows update, we retry or abort atomically.",
  "Hash map collision resolution relies on deterministic hashing with prime modulus or power-of-two masking. Under adversarial hash collision attacks, open addressing degrades to O(N) cluster scans, while balanced tree chaining maintains deterministic O(log N) lookup bounds."
];
expertAnswers.forEach((ans, idx) => addExample('excellent_expert', idx, ans, 'Pass', 94, [88, 98]));

// 2. 20 Correct Answers (score 78-88, label: Pass)
for (let i = 0; i < 20; i++) {
  const ansPool = [
    "Composite indexes sort by the first column then subsequent columns. When you query without the first column, the database cannot use the index properly and has to scan the whole table or index, making the query much slower.",
    "We can use Redis as an in-memory cache in front of our database. To prevent cache stampedes, we set up mutex locks so only one request queries the database while others wait, and we use an LRU eviction policy.",
    "A race condition is when two threads update the balance at the same time and overwrite each other. We can prevent this by using database locks with SELECT FOR UPDATE or using synchronized blocks and atomic variables.",
    "A hash map maps keys to array buckets using hashing. If two keys have the same hash, it uses chaining with a linked list. The worst case is O(N) when all keys hash to the same bucket.",
    "A process has its own memory space while threads share memory in the same process. Context switching saves the registers and state to the PCB and switches to the new process, which has CPU overhead.",
    "We use the Saga pattern where each microservice performs a local transaction and emits an event. If a step fails, compensating actions are executed to roll back previous steps and ensure eventual consistency."
  ];
  addExample('correct', i, ansPool[i % ansPool.length], 'Pass', 82, [75, 88]);
}

// 3. 20 Partially Correct Answers (score 50-68, label: Moderate)
for (let i = 0; i < 20; i++) {
  const partPool = [
    "Composite indexes have multiple columns. If you query using the columns in your index, it runs much faster because the database can find rows quicker.",
    "You can put Redis in front of the API to store frequent responses so the database doesn't get hit as much. That will improve response times.",
    "A race condition happens when two users withdraw money at the same time. You should use locks or mutexes around the balance update so only one person updates it at once.",
    "Hash maps use buckets to store values based on hash codes. Collisions happen when two items go to the same slot and they get linked together.",
    "Processes are programs running on the computer and threads are smaller parts inside them that run together to do work faster.",
    "In microservices you use message queues like RabbitMQ to send messages between services so they stay updated eventually."
  ];
  addExample('partially_correct', i, partPool[i % partPool.length], 'Moderate', 58, [48, 68]);
}

// 4. 20 Incorrect Answers (score 18-35, label: Fail)
for (let i = 0; i < 20; i++) {
  const incPool = [
    "B-tree indexes maintain a flat hash map of all columns, so column order in the index does not matter and querying any column is always guaranteed O(1).",
    "To handle high throughput and cache stampedes, you should disable cache expiration completely and store all database rows in server memory indefinitely without eviction.",
    "Race conditions only happen in single-threaded languages like JavaScript, so in multi-threaded Java or Go, thread memory is automatically isolated and race conditions cannot occur.",
    "Hash maps have worst-case lookup time of O(1) guaranteed by computer hardware, and collisions are automatically resolved by the compiler.",
    "Processes and threads are identical concepts in Linux kernels, and context switching does not involve saving CPU registers or memory switching.",
    "In microservices you must always use two-phase commit distributed transactions across all HTTP endpoints to guarantee instant ACID consistency."
  ];
  addExample('incorrect', i, incPool[i % incPool.length], 'Fail', 28, [15, 38]);
}

// 5. 10 Irrelevant Answers (score 10-25, label: Fail)
const irrelevants = [
  "My final year college project was a machine learning model for image classification using PyTorch.",
  "I have experience with Git, Docker, and GitHub Actions CI/CD pipelines for web deployment.",
  "I am very interested in web development and have built websites using HTML, CSS, and Bootstrap.",
  "In my previous internship I worked on writing unit tests and fixing frontend CSS bugs.",
  "I know React, Redux, and Tailwind CSS and have created responsive portfolio websites.",
  "I participated in college hackathons and won second prize for an IoT smart home application.",
  "I am familiar with Agile methodology and daily standup scrum meetings.",
  "I enjoy collaborating with teammates and solving complex problems with high enthusiasm.",
  "I have prepared well for this interview and am excited about joining your engineering team.",
  "My favorite programming language is Python because it has clean syntax and rich libraries."
];
irrelevants.forEach((ans, idx) => addExample('irrelevant', idx, ans, 'Fail', 16, [5, 28]));

// 6. 10 Vague / Evasive Answers (score 15-32, label: Fail)
const vagueAnswers = [
  "yes we handled caching and it worked fine.",
  "indexes speed up sql queries.",
  "use mutex lock.",
  "hash map uses hash function.",
  "threads are faster than processes.",
  "we used kafka events.",
  "i think we can use database optimization.",
  "it depends on the project requirements.",
  "we implemented best practices for performance.",
  "just restart the server if there is high load."
];
vagueAnswers.forEach((ans, idx) => addExample('vague_evasive', idx, ans, 'Fail', 22, [12, 35]));

// 7. 10 Hallucinated Technical Claims (score 20-35, label: Fail)
const hallucinatedAnswers = [
  "Binary search in a sorted array has an O(N) time complexity because it must examine every element sequentially from left to right.",
  "Redis operates by writing every single cache key directly to spinning hard disk sectors before acknowledging HTTP requests, ensuring zero RAM usage.",
  "Deadlocks in multi-threaded programs are physically impossible because modern Intel CPUs automatically reorder threads into FIFO queues.",
  "Composite indexes in SQL databases store full table copies inside RAM cache tables for every column combination.",
  "TCP connections do not perform handshakes and transmit raw UDP datagrams whenever TLS encryption is enabled.",
  "Hash map lookups are always O(N^2) because each key requires scanning the entire memory heap twice.",
  "Operating system context switches take zero nanoseconds because threads execute simultaneously on the same hardware transistor.",
  "Saga distributed transactions use quantum entanglement to synchronize SQL databases across different cloud providers instantly.",
  "ACID consistency in databases stands for Asynchronous, Cached, Idempotent, and Distributed storage.",
  "HTTP REST APIs always maintain persistent socket threads for every web user using WebSocket tunneling under HTTP 1.0."
];
hallucinatedAnswers.forEach((ans, idx) => addExample('hallucinated_claims', idx, ans, 'Fail', 25, [15, 38]));

// 8. 10 Short but Correct Answers (score 74-84, label: Pass)
const shortCorrect = [
  "Omitting the leading column prevents O(log N) index seek traversal, causing an O(N) full index or table scan.",
  "Deploy Redis with consistent hashing and use Redlock mutexes or probabilistic early expiration to prevent stampedes.",
  "Use database row locks with SELECT FOR UPDATE or optimistic version columns inside transactions.",
  "Collisions are handled by separate chaining or open addressing; worst case is O(N) when all keys collide into one bucket.",
  "Processes have private address spaces while threads share memory; context switching saves registers to PCB/TCB.",
  "Implement the Saga pattern with compensating rollback transactions via event streams.",
  "Without the leftmost indexed prefix column, the B-tree seek fails and falls back to a full scan.",
  "We use Redis cache with TTL and distributed mutex locks to serialize database queries during cold starts.",
  "Pessimistic locking with SELECT ... FOR UPDATE ensures mutual exclusion on the shared bank balance.",
  "Separate chaining puts colliding keys into a linked list or red-black tree, maintaining O(log N) bounds."
];
shortCorrect.forEach((ans, idx) => addExample('short_correct', idx, ans, 'Pass', 79, [72, 86]));

// 9. 10 Long but Incorrect Answers (score 20-35, label: Fail)
const longIncorrect = [
  "In modern relational database architectures like MySQL and PostgreSQL, composite B-tree indexes don't actually care about column ordering because the query planner flattens all indexed columns into a unified in-memory hash table. So whether you query by the second column, third column, or no column at all, the engine achieves instantaneous O(1) lookups without any full scans.",
  "When building an enterprise distributed caching layer with Redis, the industry standard practice is to completely disable TTL and key eviction policies so that all data remains indefinitely in RAM. Cache stampedes are solved by simply letting every incoming web request bypass the cache and query the database directly.",
  "In multi-threaded web applications, race conditions are strictly an artifact of interpreted programming languages. In compiled environments like Java or Go, thread memory is automatically isolated by CPU hardware registers, making it mathematically impossible for two threads to overwrite the same balance variable.",
  "Hash maps are designed to avoid collisions entirely by using infinite dynamic array allocation algorithms. As a result, hash collisions never happen in production software, and any lookup operation is mathematically guaranteed to execute in O(0) clock cycles.",
  "Processes and threads share the exact same virtual memory space across the entire Linux operating system. Context switching is merely a cosmetic logging operation performed by systemd that has zero runtime or CPU performance overhead.",
  "Distributed microservice transactions should always use two-phase commit locks across public HTTP endpoints to ensure instant consistency, because network timeouts and service crashes never occur in modern cloud Kubernetes clusters.",
  "A B-tree index in SQL is essentially a linked list where every row points to the next row in sequential disk order. Column sequence has no impact on traversal because the database queries the entire disk block in parallel anyway.",
  "To handle 50,000 requests per second, you should route all traffic directly to a single SQLite file hosted on an NFS network drive, because SQLite is faster than Redis and does not require cache invalidation.",
  "Bank account balance updates do not require any synchronization or transactions as long as you use asynchronous async/await in Node.js, because Node.js automatically pauses other HTTP requests during arithmetic operations.",
  "Operating system processes do not store state in PCBs because all process memory is stored directly inside the CPU L1 cache, eliminating context switch overhead completely."
];
longIncorrect.forEach((ans, idx) => addExample('long_incorrect', idx, ans, 'Fail', 26, [15, 38]));

const outputPath = path.join(__dirname, 'benchmarkDataset100.json');
fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

console.log(`Successfully generated ${dataset.length} benchmark evaluation scenarios in: ${outputPath}`);
console.log('Category Breakdown:');
const counts = {};
dataset.forEach(d => counts[d.category] = (counts[d.category] || 0) + 1);
console.log(counts);
