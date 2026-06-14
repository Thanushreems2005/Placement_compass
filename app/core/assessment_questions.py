ASSESSMENT_QUESTIONS = {
    "Beginner": [
        {
            "id": "beg_01",
            "topic": "Complexity Analysis",
            "text": "What is the time complexity of looking up a key in a hash table (or dict in Python) in the average case?",
            "options": [
                "O(1) - Constant time lookup",
                "O(log N) - Logarithmic time lookup",
                "O(N) - Linear scan",
                "O(N log N) - Linearithmic lookup"
            ],
            "correct_index": 0,
            "benchmark_seconds": 30,
            "explanation": "In average scenarios, a hash table uses a hash function to map keys to bucket indices directly, enabling O(1) constant time retrievals."
        },
        {
            "id": "beg_02",
            "topic": "Arrays",
            "text": "You want to find the maximum value in an unsorted integer array of size N. What is the minimum time complexity required?",
            "options": [
                "O(1)",
                "O(log N)",
                "O(N) - Linear time because every element must be inspected at least once",
                "O(N log N) - Sorting the array first"
            ],
            "correct_index": 2,
            "benchmark_seconds": 35,
            "explanation": "Because the array is unsorted, there is no structural shortcut. To guarantee finding the maximum element, you must inspect all N elements, making O(N) the minimum possible time complexity."
        },
        {
            "id": "beg_03",
            "topic": "Strings",
            "text": "Which of the following operations checks if a string of length N is a palindrome in the most memory-efficient way?",
            "options": [
                "Reversing the string and comparing it to the original (uses O(N) extra space)",
                "Using two pointers moving from ends to center, comparing characters (uses O(1) extra space)",
                "Splitting the string into characters, sorting them, and comparing them",
                "Recursively creating substrings of size N-1"
            ],
            "correct_index": 1,
            "benchmark_seconds": 45,
            "explanation": "The two-pointer technique compares characters from start and end inward, requiring only constant O(1) extra space. Reversing the string requires allocating a new string of size N."
        },
        {
            "id": "beg_04",
            "topic": "Hashing",
            "text": "Given an array `[4, 1, 2, 1, 2]`, what is the best data structure to quickly extract the number of unique elements?",
            "options": [
                "Queue",
                "Stack",
                "Set (removes duplicates automatically and provides fast size counts)",
                "Linked List"
            ],
            "correct_index": 2,
            "benchmark_seconds": 30,
            "explanation": "A Set only stores unique values. Constructing a Set from the array will instantly drop duplicate occurrences, and its size represents the unique element count."
        },
        {
            "id": "beg_05",
            "topic": "Basic Logic",
            "text": "What is the final printed output of the following Python snippet?\n\n```python\nx = 1\nfor i in range(3):\n    x = x * 2 + i\nprint(x)\n```",
            "options": [
                "8",
                "10",
                "12",
                "14"
            ],
            "correct_index": 2,
            "benchmark_seconds": 50,
            "explanation": "Let's trace step-by-step: i=0 -> x = 1*2 + 0 = 2. i=1 -> x = 2*2 + 1 = 5. i=2 -> x = 5*2 + 2 = 12. Therefore, the printed output is 12."
        },
        {
            "id": "beg_06",
            "topic": "Stacks & Queues",
            "text": "Which principle does a standard Queue data structure operate on?",
            "options": [
                "LIFO (Last In First Out)",
                "FIFO (First In First Out)",
                "LILO (Last In Last Out) only",
                "Random Access"
            ],
            "correct_index": 1,
            "benchmark_seconds": 25,
            "explanation": "A Queue operates on the First In, First Out (FIFO) principle, where the first element added is the first one to be removed."
        },
        {
            "id": "beg_07",
            "topic": "Linked Lists",
            "text": "What is the time complexity to insert a new node at the head (beginning) of a singly linked list of size N?",
            "options": [
                "O(1) - Constant time by updating pointer heads",
                "O(log N) - Splitting tree bounds",
                "O(N) - Requiring full list traversal",
                "O(N^2) - Nested pointer scans"
            ],
            "correct_index": 0,
            "benchmark_seconds": 30,
            "explanation": "Inserting at the head of a linked list only requires updating the new node's next pointer to the current head and assigning the head pointer to the new node, which is O(1) constant time."
        },
        {
            "id": "beg_08",
            "topic": "Searching",
            "text": "In the average case, how many comparisons are made when performing a linear search on an unsorted array of size N?",
            "options": [
                "1",
                "N / 2",
                "log N",
                "N"
            ],
            "correct_index": 1,
            "benchmark_seconds": 30,
            "explanation": "For a linear search on an unsorted array, the target element could be anywhere. On average, we find it halfway through, leading to N/2 comparisons."
        },
        {
            "id": "beg_09",
            "topic": "Stacks & Queues",
            "text": "Which standard operation adds an element to the top of a Stack data structure?",
            "options": [
                "Enqueue",
                "Dequeue",
                "Push",
                "Pop"
            ],
            "correct_index": 2,
            "benchmark_seconds": 20,
            "explanation": "'Push' is the standard operation used to append an element to the top of a stack, while 'Pop' removes the top element."
        },
        {
            "id": "beg_10",
            "topic": "Arrays",
            "text": "If an array is sorted, what is the best search algorithm to locate an element, and what is its time complexity?",
            "options": [
                "Linear Search - O(N)",
                "Binary Search - O(log N)",
                "Interpolation Search - O(N^2)",
                "Bubble Search - O(N log N)"
            ],
            "correct_index": 1,
            "benchmark_seconds": 35,
            "explanation": "Binary search repeatedly divides the search interval in half. For a sorted array, it provides the optimal search runtime of O(log N)."
        },
        {
            "id": "beg_11",
            "topic": "Basic Logic",
            "text": "What is the remainder of the modulo operation `17 % 5`?",
            "options": [
                "1",
                "2",
                "3",
                "4"
            ],
            "correct_index": 1,
            "benchmark_seconds": 15,
            "explanation": "17 divided by 5 is 3 with a remainder of 2. Hence, 17 % 5 = 2."
        },
        {
            "id": "beg_12",
            "topic": "Trees",
            "text": "In a simple binary tree node implementation in Python, how many pointer fields are typically defined?",
            "options": [
                "One (next)",
                "Two (left and right)",
                "Three (left, right, and parent)",
                "Variable depending on N"
            ],
            "correct_index": 1,
            "benchmark_seconds": 20,
            "explanation": "Standard binary tree nodes store a value, and contain two pointers referencing the left child and right child nodes."
        },
        {
            "id": "beg_13",
            "topic": "Sorting & Searching",
            "text": "How many element swaps are performed when sorting a already sorted array of size N using standard bubble sort?",
            "options": [
                "0",
                "N / 2",
                "N",
                "N^2"
            ],
            "correct_index": 0,
            "benchmark_seconds": 25,
            "explanation": "Bubble sort compares adjacent items. If the array is already sorted, no elements violate the sorting order, leading to exactly 0 swaps."
        },
        {
            "id": "beg_14",
            "topic": "Complexity Analysis",
            "text": "What is the memory footprint space complexity of storing a single dimensional array of size N integers?",
            "options": [
                "O(1)",
                "O(log N)",
                "O(N)",
                "O(N^2)"
            ],
            "correct_index": 2,
            "benchmark_seconds": 20,
            "explanation": "Storing N individual elements requires memory proportional to the number of elements, yielding a linear O(N) space complexity."
        },
        {
            "id": "beg_15",
            "topic": "Complexity Analysis",
            "text": "Which big-O runtime class denotes an algorithm that executes in exactly the same time duration regardless of inputs?",
            "options": [
                "O(1) - Constant Time",
                "O(log N)",
                "O(N)",
                "O(2^N)"
            ],
            "correct_index": 0,
            "benchmark_seconds": 20,
            "explanation": "Constant time O(1) indicates that execution time is independent of the size of the input data."
        }
    ],
    "Intermediate": [
        {
            "id": "int_01",
            "topic": "Two Pointers",
            "text": "Given a sorted array of N elements, you want to find if there exists a pair that sums to a target T. What is the optimal time complexity using the two-pointer technique?",
            "options": [
                "O(1)",
                "O(log N)",
                "O(N) - Linear traversal with two markers moving inwards",
                "O(N^2) - Nested loop brute force"
            ],
            "correct_index": 2,
            "benchmark_seconds": 45,
            "explanation": "By placing pointers at the start and end of the sorted array, you can either increment the left pointer (if the sum is too small) or decrement the right pointer (if the sum is too large) in O(N) linear time."
        },
        {
            "id": "int_02",
            "topic": "Binary Search",
            "text": "Which binary search equation is preferred to calculate the middle index in languages like C++, Java, or Rust to prevent integer overflow when high and low are large?",
            "options": [
                "mid = (low + high) / 2",
                "mid = low + (high - low) / 2",
                "mid = high - (high - low) / 2",
                "mid = (low + high) >> 2"
            ],
            "correct_index": 1,
            "benchmark_seconds": 40,
            "explanation": "`mid = low + (high - low) / 2` mathematically equals `(low + high) / 2` but performs subtraction first, preventing the intermediate sum `low + high` from exceeding the maximum value of a standard integer."
        },
        {
            "id": "int_03",
            "topic": "Stacks & Queues",
            "text": "To verify if a string of brackets `()[]{}` is valid and balanced, which data structure is optimal?",
            "options": [
                "Queue (FIFO)",
                "Stack (LIFO) - Matches the most recently opened bracket with the next closing bracket",
                "Binary Search Tree",
                "Min-Heap"
            ],
            "correct_index": 1,
            "benchmark_seconds": 35,
            "explanation": "A Stack operates on Last-In, First-Out (LIFO). We push open brackets onto the stack and, when a closing bracket is encountered, pop from the stack to verify if they match, perfectly evaluating nesting order."
        },
        {
            "id": "int_04",
            "topic": "Trees",
            "text": "What is the maximum number of nodes in a binary tree of height H, where the height of a root-only tree is defined as 1?",
            "options": [
                "2^H - 1 - Every level is fully populated",
                "2^(H-1)",
                "2^H",
                "H^2"
            ],
            "correct_index": 0,
            "benchmark_seconds": 50,
            "explanation": "A fully populated binary tree has 1 node at level 1, 2 nodes at level 2, 4 nodes at level 3, and so on. Summing the geometric progression up to level H gives 2^0 + 2^1 + ... + 2^(H-1) = 2^H - 1."
        },
        {
            "id": "int_05",
            "topic": "Recursion",
            "text": "What is the time complexity of the standard recursive Fibonacci function `fib(n) = fib(n-1) + fib(n-2)` without memoization?",
            "options": [
                "O(N)",
                "O(N log N)",
                "O(N^2)",
                "O(2^N) - Exponential tree growth"
            ],
            "correct_index": 3,
            "benchmark_seconds": 50,
            "explanation": "Without caching/memoization, each recursive call forks into two more calls. This creates a binary call tree of depth N, yielding a time complexity of O(2^N) (strictly about O(1.618^N) golden ratio, which is exponential)."
        },
        {
            "id": "int_06",
            "topic": "Sliding Window",
            "text": "What is the optimal time complexity to find the maximum sum of a contiguous subarray of size K in an array of size N?",
            "options": [
                "O(N^2)",
                "O(N log N)",
                "O(N) - Maintain a running sum window and slide it linearly",
                "O(1)"
            ],
            "correct_index": 2,
            "benchmark_seconds": 40,
            "explanation": "The sliding window technique avoids re-calculating the sum of overlapping elements. We add the incoming element and subtract the outgoing one in O(1) time per step, resulting in O(N) overall."
        },
        {
            "id": "int_07",
            "topic": "Greedy Algorithms",
            "text": "In the standard Interval Scheduling / Interval Merging problem, which greedy sorting strategy guarantees an optimal solution?",
            "options": [
                "Sort intervals by start time in ascending order",
                "Sort intervals by end time in ascending order",
                "Sort intervals by length of duration",
                "Sort intervals by start time in descending order"
            ],
            "correct_index": 1,
            "benchmark_seconds": 45,
            "explanation": "Sorting intervals by end time ensures that we always choose the interval that finishes earliest, leaving maximum room for subsequent interval scheduling."
        },
        {
            "id": "int_08",
            "topic": "Hashing",
            "text": "Which hash collision resolution method stores all colliding elements in a separate, secondary linked list assigned to each table slot?",
            "options": [
                "Linear Probing",
                "Quadratic Probing",
                "Chaining (or Separate Chaining)",
                "Double Hashing"
            ],
            "correct_index": 2,
            "benchmark_seconds": 35,
            "explanation": "Chaining links all colliding elements in a list at that specific index bucket. Open addressing schemes (like probing) search for empty alternative slots inside the array itself."
        },
        {
            "id": "int_09",
            "topic": "Trees",
            "text": "Which tree traversal traversal style on a Binary Search Tree (BST) visits the nodes in strictly sorted, ascending numerical order?",
            "options": [
                "Preorder",
                "Inorder",
                "Postorder",
                "Level-order"
            ],
            "correct_index": 1,
            "benchmark_seconds": 30,
            "explanation": "An inorder traversal (Left, Root, Right) of a Binary Search Tree always processes keys in ascending order because of the underlying BST structural invariants."
        },
        {
            "id": "int_10",
            "topic": "Recursion",
            "text": "What is the space complexity contribution of the call stack when executing a recursive binary search on an array of size N?",
            "options": [
                "O(1)",
                "O(log N) - Depths of split bounds",
                "O(N)",
                "O(N log N)"
            ],
            "correct_index": 1,
            "benchmark_seconds": 40,
            "explanation": "With each recursive call, the search space is cut in half. The maximum depth of the call stack is O(log N), representing the maximum space allocated for recursive activation records."
        },
        {
            "id": "int_11",
            "topic": "Sorting & Searching",
            "text": "Which sorting algorithm splits an array of size N into halves recursively, sorts them, and merges them using O(N) extra helper space?",
            "options": [
                "Quick Sort",
                "Merge Sort",
                "Insertion Sort",
                "Selection Sort"
            ],
            "correct_index": 1,
            "benchmark_seconds": 45,
            "explanation": "Merge sort divides the unsorted list into N sublists recursively until each contains 1 element, then repeatedly merges sublists in O(N log N) time, utilizing O(N) space."
        },
        {
            "id": "int_12",
            "topic": "Graphs",
            "text": "Which queue-driven graph traversal visits vertices level-by-level starting from a source node, and is optimal to find the shortest path in unweighted graphs?",
            "options": [
                "Depth First Search (DFS)",
                "Breadth First Search (BFS)",
                "Kruskal's Algorithm",
                "Prim's Algorithm"
            ],
            "correct_index": 1,
            "benchmark_seconds": 40,
            "explanation": "BFS uses a Queue to explore adjacent neighbors fully before stepping deeper, resolving the shortest topological path in unweighted graphs."
        },
        {
            "id": "int_13",
            "topic": "Graphs",
            "text": "Which traversal style uses recursion (or a stack) to explore as deep as possible along each branch before backtracking?",
            "options": [
                "BFS",
                "DFS",
                "Dijkstra",
                "Kruskal"
            ],
            "correct_index": 1,
            "benchmark_seconds": 35,
            "explanation": "DFS explores complete linear paths to leaf vertices first before popping layers back to resume unvisited branches."
        },
        {
            "id": "int_14",
            "topic": "Graphs",
            "text": "Which graph topological scheduling algorithm outputs a linear ordering of vertices for a Directed Acyclic Graph (DAG)?",
            "options": [
                "Topological Sort",
                "Dijkstra's Algorithm",
                "Floyd-Warshall",
                "Quick Select"
            ],
            "correct_index": 0,
            "benchmark_seconds": 45,
            "explanation": "Topological sorting constructs a valid linear sequence where edge direction from U to V indicates that U must precede V."
        },
        {
            "id": "int_15",
            "topic": "Dynamic Programming",
            "text": "What is the time complexity of the Floyd-Warshall all-pairs shortest path algorithm on a graph with V vertices?",
            "options": [
                "O(V)",
                "O(V log V)",
                "O(V^2)",
                "O(V^3) - Triple nested dynamic programming loops"
            ],
            "correct_index": 3,
            "benchmark_seconds": 50,
            "explanation": "Floyd-Warshall employs three nested iterations tracking each vertex as a potential intermediate hop, yielding O(V^3) time."
        }
    ],
    "Advanced": [
        {
            "id": "adv_01",
            "topic": "Dynamic Programming",
            "text": "Which of the following describes the difference between memoization (Top-down DP) and tabulation (Bottom-up DP)?",
            "options": [
                "Memoization is O(N^2) while tabulation is O(N)",
                "Memoization uses recursion and solves subproblems on-demand, whereas tabulation is iterative and solves all subproblems starting from base cases",
                "Tabulation has worse space complexity because of recursion stack overhead",
                "Memoization is always faster because it does not require table lookups"
            ],
            "correct_index": 1,
            "benchmark_seconds": 60,
            "explanation": "Memoization (top-down) resolves recursive subproblems on-the-fly and caches them, avoiding unneeded branches. Tabulation (bottom-up) is an iterative approach that fills a lookup table from base states up to the target state."
        },
        {
            "id": "adv_02",
            "topic": "Graphs",
            "text": "What is the time complexity of Dijkstra's single-source shortest path algorithm on a graph with V vertices and E edges using a binary heap priority queue?",
            "options": [
                "O(V^2)",
                "O(E log V) - Extracting minimum and updating edge keys in the priority queue",
                "O(V log E)",
                "O(V + E)"
            ],
            "correct_index": 1,
            "benchmark_seconds": 70,
            "explanation": "Each edge operation involves a potential priority queue update (decrease key) taking O(log V) time, and vertex extractions take O(V log V) time. The overall time complexity is bound by O((V + E) log V), commonly represented as O(E log V) for connected graphs."
        },
        {
            "id": "adv_03",
            "topic": "Advanced Structures",
            "text": "You need to store a set of strings and perform fast prefix-matching operations (e.g. autocomplete). Which data structure yields the most optimal prefix-lookup time?",
            "options": [
                "Binary Search Tree",
                "Trie (Prefix Tree) - Nodes represent characters, allowing quick traversal down word prefixes",
                "Hash Map with Chaining",
                "Red-Black Tree"
            ],
            "correct_index": 1,
            "benchmark_seconds": 45,
            "explanation": "A Trie structures words as paths of character nodes. To search for a prefix of length L, it takes O(L) time regardless of how many total words are stored in the data structure, which is extremely efficient."
        },
        {
            "id": "adv_04",
            "topic": "Bitwise Operations",
            "text": "How can you determine if a positive integer N is a power of two using a single bitwise operation?",
            "options": [
                "(N & (N - 1)) == 0 - A power of two has exactly one bit set; subtracting 1 flips all bits after it",
                "(N | (N - 1)) == 0",
                "(N ^ (N - 1)) == 0",
                "(N & ~N) == 0"
            ],
            "correct_index": 0,
            "benchmark_seconds": 50,
            "explanation": "Integers that are powers of two look like `1000...` in binary. Subtracting 1 yields `0111...`. Performing a bitwise AND between these two values gives exactly 0. Any other number will have multiple set bits and result in a non-zero value."
        },
        {
            "id": "adv_05",
            "topic": "Cache Optimization",
            "text": "To design a Least Recently Used (LRU) Cache with get() and put() operations in O(1) constant time complexity, which combination of data structures is required?",
            "options": [
                "A Max-Heap and an Array",
                "A Doubly Linked List (for fast eviction/reordering) and a Hash Map (for constant time key lookups)",
                "A Binary Search Tree and a Queue",
                "A Singly Linked List and a Stack"
            ],
            "correct_index": 1,
            "benchmark_seconds": 80,
            "explanation": "A doubly linked list allows removing and appending nodes in O(1) time when we hit or add elements. A hash map stores pointers to these nodes, giving immediate O(1) address lookups by key."
        },
        {
            "id": "adv_06",
            "topic": "Segment Trees",
            "text": "Which advanced data structure provides logarithmic O(log N) time for BOTH range sum queries and dynamic single element updates?",
            "options": [
                "Prefix Sum Array",
                "Segment Tree (or Fenwick / Binary Indexed Tree)",
                "Unsorted Hash Table",
                "Red-Black Tree"
            ],
            "correct_index": 1,
            "benchmark_seconds": 70,
            "explanation": "A Prefix Sum Array allows O(1) range queries but takes O(N) for updates. A Segment Tree organizes data in a binary tree hierarchy, facilitating both operations in optimal O(log N) time."
        },
        {
            "id": "adv_07",
            "topic": "Graphs",
            "text": "Which advanced data structure locates Strongly Connected Components (SCCs) in a directed graph using a single Depth First Search (DFS) pass?",
            "options": [
                "Kruskal's Algorithm",
                "Kosaraju's Algorithm (requires two DFS passes)",
                "Tarjan's Algorithm (uses low-link vertex values and a stack in a single pass)",
                "Bellman-Ford Algorithm"
            ],
            "correct_index": 2,
            "benchmark_seconds": 80,
            "explanation": "Tarjan's algorithm uses a DFS-based stack and tracks DFS discovery indices alongside 'low-link' nodes to resolve all SCC boundaries in a single O(V + E) pass."
        },
        {
            "id": "adv_08",
            "topic": "Advanced Strings",
            "text": "What is the space complexity required to construct the prefix lookup table (pi-array/failure function) in the Knuth-Morris-Pratt (KMP) string search algorithm for a pattern of length M?",
            "options": [
                "O(1)",
                "O(M) - Auxiliary array matching pattern characters",
                "O(N) - Proportional to target text size",
                "O(M log M)"
            ],
            "correct_index": 1,
            "benchmark_seconds": 55,
            "explanation": "The KMP preprocessing step builds a prefix lookup table (failure function) that depends strictly on the search pattern, requiring O(M) auxiliary space."
        },
        {
            "id": "adv_09",
            "topic": "Dynamic Programming",
            "text": "In Dynamic Programming, which property guarantees that a problem's global optimal solution can be constructed from the optimal solutions of its subproblems?",
            "options": [
                "Overlapping Subproblems",
                "Optimal Substructure",
                "Greedy Choice Property",
                "Tabulation Memoization Ratio"
            ],
            "correct_index": 1,
            "benchmark_seconds": 45,
            "explanation": "'Optimal Substructure' means optimal subproblem results assemble into the overall optimal result. 'Overlapping Subproblems' means the same subproblems are solved repeatedly, making caching useful."
        },
        {
            "id": "adv_10",
            "topic": "Cache Optimization",
            "text": "To implement a Least Frequently Used (LFU) Cache (evicting elements with lowest access frequency) in O(1) time complexity, which data structures combination is optimal?",
            "options": [
                "A hash map of keys to nodes, and a doubly linked list of frequency blocks (each holding an internal doubly linked list of nodes)",
                "A hash map and a binary min-heap",
                "A doubly linked list and an AVL tree",
                "A circular array and a stack"
            ],
            "correct_index": 0,
            "benchmark_seconds": 90,
            "explanation": "By utilizing a doubly linked list of frequency chains and mapping them in a hash table, LFU operations (evicting least frequently used and bumping frequencies) execute in constant O(1) time."
        },
        {
            "id": "adv_11",
            "topic": "Graphs",
            "text": "Which pathfinding search algorithm uses a heuristic function `f(n) = g(n) + h(n)` to guide traversal efficiently toward a target goal node?",
            "options": [
                "DFS",
                "A* Search Algorithm",
                "Floyd-Warshall",
                "Kruskal's MST"
            ],
            "correct_index": 1,
            "benchmark_seconds": 65,
            "explanation": "A* Search combines the path cost from start `g(n)` and the estimated heuristic cost to target `h(n)` to explore optimal paths faster than standard Dijkstra."
        },
        {
            "id": "adv_12",
            "topic": "Trees",
            "text": "Which balanced binary search tree maintains a height difference of at most 1 between left and right subtrees of any node, correcting balance with tree rotations?",
            "options": [
                "Max-Heap",
                "AVL Tree",
                "Splay Tree",
                "Trie"
            ],
            "correct_index": 1,
            "benchmark_seconds": 70,
            "explanation": "AVL trees track node balance factors and trigger Single/Double rotations to guarantee strict logarithmic O(log N) heights for all nodes."
        },
        {
            "id": "adv_13",
            "topic": "Trees",
            "text": "Which multi-way search tree is highly optimized for storage systems to minimize disk page access reads by keeping keys highly branched?",
            "options": [
                "Binary Search Tree",
                "B-Tree (or B+ Tree)",
                "Red-Black Tree",
                "AVL Tree"
            ],
            "correct_index": 1,
            "benchmark_seconds": 75,
            "explanation": "B-Trees hold multiple keys per node, keeping tree depth very shallow. This greatly reduces disk I/O seek events for high-scale database storage layers."
        },
        {
            "id": "adv_14",
            "topic": "Graphs",
            "text": "Which network flow algorithm calculates the maximum flow from a source to a sink by repeatedly finding augmenting paths in residual graphs?",
            "options": [
                "Ford-Fulkerson Algorithm",
                "Dijkstra's Shortest Path",
                "Bellman-Ford Algorithm",
                "Tarjan's SCC Algorithm"
            ],
            "correct_index": 0,
            "benchmark_seconds": 80,
            "explanation": "Ford-Fulkerson (and its BFS variant Edmonds-Karp) routes flow along capacity augmenting paths until no residual path remains."
        },
        {
            "id": "adv_15",
            "topic": "Advanced Strings",
            "text": "Which string search algorithm uses a polynomial rolling hash function to match a pattern inside a text in O(N + M) average time?",
            "options": [
                "Brute Force Matcher",
                "Rabin-Karp Algorithm",
                "KMP Algorithm",
                "Boyer-Moore Algorithm"
            ],
            "correct_index": 1,
            "benchmark_seconds": 65,
            "explanation": "Rabin-Karp calculates dynamic hash keys on rolling substring windows to achieve linear average time matching."
        }
    ]
}
