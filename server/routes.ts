import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertContestSchema, insertProblemSchema, insertTestCaseSchema, insertMcqQuestionSchema, insertSubmissionSchema } from "@shared/schema";
import { exec, execSync } from "child_process";
import { writeFile, unlink, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Global execution controls and helpers
const isWindows = process.platform === "win32";
const MAX_CONCURRENT_EXECUTIONS = Number(process.env.MAX_CONCURRENT_EXECUTIONS || 16);

class AsyncSemaphore {
  private capacity: number;
  private queue: Array<() => void> = [];
  private current: number = 0;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
  }

  async acquire(): Promise<void> {
    if (this.current < this.capacity) {
      this.current += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.current += 1;
  }

  release(): void {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const executionLimiter = new AsyncSemaphore(MAX_CONCURRENT_EXECUTIONS);

let cachedPythonCommand: string | null = null;
function tryExecVersion(command: string): boolean {
  try {
    // Use -V which prints to stderr in some Python versions, but execSync will throw only on non-zero exit codes
    execSync(`${command} -V`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function resolvePythonCommand(preferPy3: boolean): string {
  if (cachedPythonCommand) return cachedPythonCommand;
  // Candidate lists, in order
  const candidates: string[] = isWindows
    ? (preferPy3
        ? ["py -3", "python3", "python", "py"]
        : ["python", "py -3", "python3", "py"]) 
    : (preferPy3
        ? ["python3", "python"]
        : ["python", "python3"]);

  for (const candidate of candidates) {
    if (tryExecVersion(candidate)) {
      cachedPythonCommand = candidate;
      return candidate;
    }
  }
  // Fallback to a sensible default; it will fail later with clear error handling
  cachedPythonCommand = preferPy3 ? (isWindows ? "py -3" : "python3") : "python";
  return cachedPythonCommand;
}

function normalizeTestInput(raw: string): string {
  if (raw == null) return "";
  let s = String(raw);
  
  console.log(`Normalizing input: "${s}"`);
  
  // Handle the specific case where input is stored as "10\\n 20" (literal backslash-n)
  if (s.includes('\\n')) {
    console.log(`  Found literal \\n, replacing with actual newlines`);
    s = s.replace(/\\n/g, "\n");
  }
  
  // First normalize Windows CRLF to LF if present literally
  s = s.replace(/\r\n/g, "\n");
  
  // Also handle the case where it might be "10\n 20" (single backslash)
  if (s.includes('\n')) {
    console.log(`  Found actual newlines, cleaning up`);
    // Split by newlines and rejoin to normalize spacing
    const lines = s.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    s = lines.join('\n');
  }
  
  // Unescape other common sequences
  s = s
    .replace(/\\r\\n/g, "\n")
    .replace(/\\t/g, "\t");
    
  console.log(`  Final normalized: "${s.replace(/\n/g, '\\n')}"`);
  
  // Test the normalization with the specific case we're seeing
  if (raw === "10\\n 20") {
    console.log(`  TEST CASE: Input "${raw}" should normalize to "10\n20"`);
    console.log(`  Actual result: "${s}"`);
    if (s !== "10\n20") {
      console.error(`  NORMALIZATION FAILED! Expected "10\n20", got "${s}"`);
    } else {
      console.log(`  NORMALIZATION SUCCESS!`);
    }
  }
  
  return s;
}

// Code execution and evaluation functions
async function executeCode(code: string, language: string, testCases: any[], problem: any) {
  // If no test cases, return empty result
  if (!testCases || testCases.length === 0) {
    return {
      testResults: [],
      executionTime: 0,
      memoryUsage: 0,
      passed: false
    };
  }

  const results = [];
  let totalExecutionTime = 0;
  let totalMemoryUsage = 0;
  
  for (const testCase of testCases) {
    try {
      const result = await runTestCase(code, language, testCase, problem);
      results.push(result);
      totalExecutionTime += result.executionTime || 0;
      totalMemoryUsage = Math.max(totalMemoryUsage, result.memoryUsage || 0);
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: "Execution Error",
        passed: false,
        executionTime: 0,
        memoryUsage: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Ensure we don't return NaN values
  const safeExecutionTime = isNaN(totalExecutionTime) ? 0 : totalExecutionTime;
  const safeMemoryUsage = isNaN(totalMemoryUsage) ? 0 : totalMemoryUsage;
  
  return {
    testResults: results,
    executionTime: safeExecutionTime,
    memoryUsage: safeMemoryUsage,
    passed: results.every(r => r.passed)
  };
}

async function evaluateCode(code: string, language: string, testCases: any[], problem: any) {
  // If no test cases, return default result
  if (!testCases || testCases.length === 0) {
    return {
      status: 'no_test_cases',
      score: 0,
      executionTime: 0,
      memoryUsage: 0,
      testResults: []
    };
  }

  const executionResult = await executeCode(code, language, testCases, problem);
  
  // Calculate score based on passed test cases
  // Ensure we only count test cases that actually have results
  const passedTests = executionResult.testResults.filter(result => result.passed);
  const score = Math.round((passedTests.length / executionResult.testResults.length) * problem.points);
  
  // Determine status
  let status = 'accepted';
  if (executionResult.testResults.some(r => r.error)) {
    status = 'runtime_error';
  } else if (passedTests.length === 0) {
    status = 'wrong_answer';
  } else if (passedTests.length < executionResult.testResults.length) {
    status = 'partial_accepted';
  }
  
  return {
    status,
    score,
    executionTime: executionResult.executionTime,
    memoryUsage: executionResult.memoryUsage,
    testResults: executionResult.testResults
  };
}

async function runTestCase(code: string, language: string, testCase: any, problem: any) {
  const startTime = Date.now();
  const tempDir = join(tmpdir(), `codejudge-${Date.now()}`);
  
  await executionLimiter.acquire();
  try {
    await mkdir(tempDir, { recursive: true });
    
    let filename: string;
    let command: string;
    let executableName: string;
    
    switch (language) {
      case 'javascript':
        filename = 'solution.js';
        command = `node ${filename}`;
        executableName = '';
        break;
      case 'python':
        filename = 'solution.py';
        command = `${resolvePythonCommand(false)} ${filename}`;
        executableName = '';
        break;
      case 'python3':
        filename = 'solution.py';
        command = `${resolvePythonCommand(true)} ${filename}`;
        executableName = '';
        break;
      case 'java':
        filename = 'Solution.java';
        // Fix Java compilation and execution
        command = `javac ${filename} && java -cp . Solution`;
        executableName = 'Solution.class';
        break;
      case 'cpp':
        filename = 'solution.cpp';
        // Windows uses .exe and runs without './'
        command = isWindows
          ? `g++ -std=c++17 ${filename} -o solution.exe && solution.exe`
          : `g++ -std=c++17 ${filename} -o solution && ./solution`;
        executableName = isWindows ? 'solution.exe' : 'solution';
        break;
      case 'c':
        filename = 'solution.c';
        command = isWindows
          ? `gcc ${filename} -o solution.exe && solution.exe`
          : `gcc ${filename} -o solution && ./solution`;
        executableName = isWindows ? 'solution.exe' : 'solution';
        break;
      case 'csharp':
        filename = 'solution.cs';
        command = `dotnet run --project . --no-build`;
        executableName = '';
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
    
    // Write code to file
    await writeFile(join(tempDir, filename), code);
    
    // For Java, we need to handle the class name properly
    if (language === 'java') {
      // Extract class name from code (should match filename)
      const classNameMatch = code.match(/class\s+(\w+)/);
      if (classNameMatch && classNameMatch[1] !== 'Solution') {
        // If class name doesn't match filename, update the command
        const actualClassName = classNameMatch[1];
        command = `javac ${filename} && java -cp . ${actualClassName}`;
        // Also update the filename to match the class name
        const newFilename = `${actualClassName}.java`;
        await writeFile(join(tempDir, newFilename), code);
        filename = newFilename;
      }
    }
    
    // For C#, create a simple project structure
    if (language === 'csharp') {
      const projectFile = `<?xml version="1.0" encoding="utf-8"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>`;
      await writeFile(join(tempDir, 'solution.csproj'), projectFile);
    }
    
    // Execute code with test case input
    const result = await new Promise<string>((resolve, reject) => {
      const process = exec(command, {
        cwd: tempDir,
        timeout: problem.timeLimit || 5000,
        maxBuffer: 1024 * 1024 // 1MB
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          // Provide more specific error messages for different languages
          let errorMessage = stderr || `Process exited with code ${code}`;
          
          if (language === 'java' && stderr.includes('javac')) {
            errorMessage = `Java compilation error: ${stderr}`;
          } else if (language === 'cpp' && stderr.includes('g++')) {
            errorMessage = `C++ compilation error: ${stderr}`;
          } else if (language === 'c' && stderr.includes('gcc')) {
            errorMessage = `C compilation error: ${stderr}`;
          } else if (language === 'csharp' && stderr.includes('dotnet')) {
            errorMessage = `C# compilation error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && /not found|is not recognized/.test(stderr)) {
            errorMessage = `Python is not installed or not accessible. Please install Python 3.x and ensure it's in your PATH.`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('SyntaxError')) {
            errorMessage = `Python syntax error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('IndentationError')) {
            errorMessage = `Python indentation error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('NameError')) {
            errorMessage = `Python name error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('TypeError')) {
            errorMessage = `Python type error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('ValueError')) {
            errorMessage = `Python value error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('IndexError')) {
            errorMessage = `Python index error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('KeyError')) {
            errorMessage = `Python key error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('ZeroDivisionError')) {
            errorMessage = `Python division by zero error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('FileNotFoundError')) {
            errorMessage = `Python file not found error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('PermissionError')) {
            errorMessage = `Python permission error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('TimeoutError')) {
            errorMessage = `Python execution timed out: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('MemoryError')) {
            errorMessage = `Python memory error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('RecursionError')) {
            errorMessage = `Python recursion error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('ImportError')) {
            errorMessage = `Python import error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('ModuleNotFoundError')) {
            errorMessage = `Python module not found error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('AttributeError')) {
            errorMessage = `Python attribute error: ${stderr}`;
          } else if ((language === 'python' || language === 'python3') && stderr.includes('RuntimeError')) {
            errorMessage = `Python runtime error: ${stderr}`;
          }
          
          reject(new Error(errorMessage));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
      
      // Send input to stdin - handle different languages appropriately
      if (process.stdin && testCase.input !== undefined && testCase.input !== null) {
        let input = normalizeTestInput(testCase.input);
        // Ensure input ends with a newline for all languages to flush stdin
        if (!input.endsWith('\n')) {
          input += '\n';
        }
        
        // Debug logging to see what's being sent
            // Debug logging removed to reduce log noise
        
        process.stdin.write(input);
        process.stdin.end();
      }
    });
    
    const executionTime = Date.now() - startTime;
    const memoryUsage = 0; // Memory usage tracking would require more complex setup
    
    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result,
      passed: result.trim() === testCase.expectedOutput.trim(),
      executionTime,
      memoryUsage,
      error: undefined
    };
    
  } catch (error) {
    // Return error result instead of throwing
    const executionTime = Date.now() - startTime;
    console.error(`Error executing ${language} code:`, error);
    console.error(`Test case input:`, testCase.input);
    console.error(`Code:`, code.substring(0, 200) + (code.length > 200 ? '...' : ''));
    
    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: "Execution Error",
      passed: false,
      executionTime,
      memoryUsage: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    // Cleanup temp files and directory recursively
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    executionLimiter.release();
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Auth routes are now handled in auth.ts

  // Admin middleware
  const isAdmin = async (req: Request, res: Response, next: any) => {
    try {
      const userId = req.session.userId;
      console.log('isAdmin middleware - userId:', userId);
      if (!userId) {
        console.log('No userId in session');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.getUserById(userId);
      console.log('isAdmin middleware - user:', user ? { id: user.id, role: user.role } : 'null');
      if (!user || user.role !== 'admin') {
        console.log('User not found or not admin');
        return res.status(403).json({ message: "Admin access required" });
      }
      console.log('Admin access granted');
      next();
    } catch (error) {
      console.error('isAdmin middleware error:', error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // Test route to check if admin routes are working
  app.get('/api/admin/test', isAuthenticated, isAdmin, async (req, res) => {
    res.json({ message: "Admin route is working", userId: req.session.userId });
  });

  // Simple test route without admin check
  app.get('/api/admin/simple-test', isAuthenticated, async (req, res) => {
    res.json({ message: "Simple admin route is working", userId: req.session.userId });
  });

  // Admin user management routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('Fetching users for admin:', req.session.userId);
      const users = await storage.getAllUsers();
      console.log('Found users:', users.length);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email, username, studentId, role } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        username,
        studentId,
        role
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Contest routes
  app.get('/api/contests', isAuthenticated, async (req, res) => {
    try {
      const contests = await storage.getContests();
      res.json(contests);
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({ message: "Failed to fetch contests" });
    }
  });

  app.get('/api/contests/active', isAuthenticated, async (req, res) => {
    try {
      const contests = await storage.getActiveContests();
      res.json(contests);
    } catch (error) {
      console.error("Error fetching active contests:", error);
      res.status(500).json({ message: "Failed to fetch active contests" });
    }
  });

  app.post('/api/contests', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      
      // Convert date strings to Date objects before validation
      const contestData = insertContestSchema.parse({
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        createdBy: userId
      });
      const contest = await storage.createContest(contestData);
      res.json(contest);
    } catch (error) {
      console.error("Error creating contest:", error);
      res.status(500).json({ message: "Failed to create contest" });
    }
  });

  app.get('/api/contests/:id', isAuthenticated, async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }
      res.json(contest);
    } catch (error) {
      console.error("Error fetching contest:", error);
      res.status(500).json({ message: "Failed to fetch contest" });
    }
  });

  app.put('/api/contests/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const contestId = req.params.id;
      const existingContest = await storage.getContest(contestId);
      if (!existingContest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      // Convert date strings to Date objects before validation
      const contestData = insertContestSchema.parse({
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        createdBy: existingContest.createdBy // Preserve the original creator
      });

      const updatedContest = await storage.updateContest(contestId, contestData);
      if (!updatedContest) {
        return res.status(500).json({ message: "Failed to update contest" });
      }

      res.json(updatedContest);
    } catch (error) {
      console.error("Error updating contest:", error);
      res.status(500).json({ message: "Failed to update contest" });
    }
  });

  app.delete('/api/contests/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const contestId = req.params.id;
      const existingContest = await storage.getContest(contestId);
      if (!existingContest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      const deleted = await storage.deleteContest(contestId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete contest" });
      }

      res.json({ message: "Contest deleted successfully" });
    } catch (error) {
      console.error("Error deleting contest:", error);
      res.status(500).json({ message: "Failed to delete contest" });
    }
  });

  // Problem routes
  app.post('/api/problems', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const problemData = insertProblemSchema.parse(req.body);
      const problem = await storage.createProblem(problemData);
      res.json(problem);
    } catch (error) {
      console.error("Error creating problem:", error);
      res.status(500).json({ message: "Failed to create problem" });
    }
  });

  app.put('/api/problems/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const problemId = req.params.id;
      const problemData = insertProblemSchema.parse(req.body);
      const updatedProblem = await storage.updateProblem(problemId, problemData);
      if (!updatedProblem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(updatedProblem);
    } catch (error) {
      console.error("Error updating problem:", error);
      res.status(500).json({ message: "Failed to update problem" });
    }
  });

  app.delete('/api/problems/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const problemId = req.params.id;
      const deleted = await storage.deleteProblem(problemId);
      if (!deleted) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json({ message: "Problem deleted successfully" });
    } catch (error) {
      console.error("Error deleting problem:", error);
      res.status(500).json({ message: "Failed to delete problem" });
    }
  });

  app.get('/api/contests/:contestId/problems', isAuthenticated, async (req, res) => {
    try {
      const problems = await storage.getContestProblems(req.params.contestId);
      res.json(problems);
    } catch (error) {
      console.error("Error fetching contest problems:", error);
      res.status(500).json({ message: "Failed to fetch contest problems" });
    }
  });

  // Test case routes
  app.post('/api/test-cases', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const testCaseData = insertTestCaseSchema.parse(req.body);
      const testCase = await storage.createTestCase(testCaseData);
      res.json(testCase);
    } catch (error) {
      console.error("Error creating test case:", error);
      res.status(500).json({ message: "Failed to create test case" });
    }
  });

  app.put('/api/test-cases/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const testCaseId = req.params.id;
      const testCaseData = insertTestCaseSchema.parse(req.body);
      const updatedTestCase = await storage.updateTestCase(testCaseId, testCaseData);
      if (!updatedTestCase) {
        return res.status(404).json({ message: "Test case not found" });
      }
      res.json(updatedTestCase);
    } catch (error) {
      console.error("Error updating test case:", error);
      res.status(500).json({ message: "Failed to update test case" });
    }
  });

  app.delete('/api/test-cases/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const testCaseId = req.params.id;
      const deleted = await storage.deleteTestCase(testCaseId);
      if (!deleted) {
        return res.status(404).json({ message: "Test case not found" });
      }
      res.json({ message: "Test case deleted successfully" });
    } catch (error) {
      console.error("Error deleting test case:", error);
      res.status(500).json({ message: "Failed to delete test case" });
    }
  });

  // MCQ routes
  app.post('/api/mcq-questions', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const mcqData = insertMcqQuestionSchema.parse(req.body);
      const mcq = await storage.createMcqQuestion(mcqData);
      res.json(mcq);
    } catch (error) {
      console.error("Error creating MCQ question:", error);
      res.status(500).json({ message: "Failed to create MCQ question" });
    }
  });

  app.put('/api/mcq-questions/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const mcqId = req.params.id;
      const mcqData = insertMcqQuestionSchema.parse(req.body);
      const updatedMcq = await storage.updateMcqQuestion(mcqId, mcqData);
      if (!updatedMcq) {
        return res.status(404).json({ message: "MCQ question not found" });
      }
      res.json(updatedMcq);
    } catch (error) {
      console.error("Error updating MCQ question:", error);
      res.status(500).json({ message: "Failed to update MCQ question" });
    }
  });

  app.delete('/api/mcq-questions/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const mcqId = req.params.id;
      const deleted = await storage.deleteMcqQuestion(mcqId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete MCQ question" });
      }
      res.json({ message: "MCQ question deleted successfully" });
    } catch (error) {
      console.error("Error deleting MCQ question:", error);
      res.status(500).json({ message: "Failed to delete MCQ question" });
    }
  });

  app.get('/api/contests/:contestId/mcq-questions', isAuthenticated, async (req, res) => {
    try {
      const mcqQuestions = await storage.getContestMcqQuestions(req.params.contestId);
      res.json(mcqQuestions);
    } catch (error) {
      console.error("Error fetching contest MCQ questions:", error);
      res.status(500).json({ message: "Failed to fetch contest MCQ questions" });
    }
  });

  // Contest participation
  app.post('/api/contests/:id/join', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Debug logging removed to reduce log noise
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      const contestId = req.params.id;
      
      // Check if user is already disqualified from this contest
      const existingParticipants = await storage.getContestParticipants(contestId);
      const existingParticipant = existingParticipants.find(p => p.userId === userId);
      
      if (existingParticipant && existingParticipant.isDisqualified) {
        return res.status(403).json({ message: "You are disqualified from this contest and cannot rejoin" });
      }
      
      const participation = await storage.joinContest({
        contestId,
        userId,
        totalScore: 0,
        tabSwitches: 0,
        isDisqualified: false
      });
      
      res.json(participation);
    } catch (error) {
      console.error("Error joining contest:", error);
      res.status(500).json({ message: "Failed to join contest" });
    }
  });

  // Problem routes
  app.get('/api/contests/:contestId/problems', isAuthenticated, async (req, res) => {
    try {
      const problems = await storage.getContestProblems(req.params.contestId);
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });

  app.post('/api/contests/:contestId/problems', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const problemData = insertProblemSchema.parse({
        ...req.body,
        contestId: req.params.contestId
      });
      const problem = await storage.createProblem(problemData);
      res.json(problem);
    } catch (error) {
      console.error("Error creating problem:", error);
      res.status(500).json({ message: "Failed to create problem" });
    }
  });

  app.get('/api/problems/:id', isAuthenticated, async (req, res) => {
    try {
      const problem = await storage.getProblem(req.params.id);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      console.error("Error fetching problem:", error);
      res.status(500).json({ message: "Failed to fetch problem" });
    }
  });

  // Test cases
  app.get('/api/problems/:problemId/testcases', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      const user = await storage.getUser(userId);
      
      let testCases;
      if (user?.role === 'admin') {
        // Admins can see all test cases
        testCases = await storage.getProblemTestCases(req.params.problemId);
      } else {
        // Students can only see visible test cases
        testCases = await storage.getVisibleTestCases(req.params.problemId);
      }
      
      res.json(testCases);
    } catch (error) {
      console.error("Error fetching test cases:", error);
      res.status(500).json({ message: "Failed to fetch test cases" });
    }
  });

  app.post('/api/problems/:problemId/testcases', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const testCaseData = insertTestCaseSchema.parse({
        ...req.body,
        problemId: req.params.problemId
      });
      const testCase = await storage.createTestCase(testCaseData);
      res.json(testCase);
    } catch (error) {
      console.error("Error creating test case:", error);
      res.status(500).json({ message: "Failed to create test case" });
    }
  });

  // MCQ routes
  app.get('/api/contests/:contestId/mcq', isAuthenticated, async (req, res) => {
    try {
      const mcqQuestions = await storage.getContestMcqQuestions(req.params.contestId);
      res.json(mcqQuestions);
    } catch (error) {
      console.error("Error fetching MCQ questions:", error);
      res.status(500).json({ message: "Failed to fetch MCQ questions" });
    }
  });

  app.post('/api/contests/:contestId/mcq', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const mcqData = insertMcqQuestionSchema.parse({
        ...req.body,
        contestId: req.params.contestId
      });
      const mcq = await storage.createMcqQuestion(mcqData);
      res.json(mcq);
    } catch (error) {
      console.error("Error creating MCQ question:", error);
      res.status(500).json({ message: "Failed to create MCQ question" });
    }
  });

  // Submission routes
  app.post('/api/submissions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      const submissionData = insertSubmissionSchema.parse({
        ...req.body,
        userId: userId
      });
      
      const submission = await storage.createSubmission(submissionData);
      
      // If it's a programming problem, evaluate the code
      if (req.body.problemId) {
        try {
          const problem = await storage.getProblem(req.body.problemId);
          // Use visible test cases for submission (same as Run Code) to avoid hidden test case failures
          const testCases = await storage.getVisibleTestCases(req.body.problemId);
          
          if (problem && testCases && testCases.length > 0) {
            // Evaluate code against visible test cases
            const evaluationResult = await evaluateCode(req.body.code, req.body.language, testCases, problem);
            
            // Update submission with real results
            await storage.updateSubmissionStatus(
              submission.id, 
              evaluationResult.status, 
              evaluationResult.score, 
              evaluationResult.executionTime, 
              evaluationResult.memoryUsage
            );
            
            // Emit real-time update
            io.to(`contest-${submission.contestId}`).emit('submission-update', {
              submissionId: submission.id,
              userId: submission.userId,
              status: evaluationResult.status,
              score: evaluationResult.score,
              testResults: evaluationResult.testResults
            });
            
            return res.json({
              ...submission,
              evaluationResult
            });
          } else if (problem && (!testCases || testCases.length === 0)) {
            // No test cases available - mark as no test cases
            await storage.updateSubmissionStatus(submission.id, 'no_test_cases', 0);
            return res.json({
              ...submission,
              evaluationResult: {
                status: 'no_test_cases',
                score: 0,
                executionTime: 0,
                memoryUsage: 0,
                testResults: []
              }
            });
          }
        } catch (evalError) {
          console.error("Code evaluation failed:", evalError);
          console.error("Problem ID:", req.body.problemId);
          console.error("Language:", req.body.language);
          console.error("Code length:", req.body.code?.length || 0);
          // Fall back to pending status if evaluation fails
          await storage.updateSubmissionStatus(submission.id, 'evaluation_error', 0);
        }
      }
      
      // For MCQ questions, just return the submission
      res.json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });



  // Code execution endpoint
  app.post('/api/execute-code', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { code, language, problemId, testCaseIndex } = req.body;
      
      if (!code || !language || !problemId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const problem = await storage.getProblem(problemId);
      const testCases = await storage.getVisibleTestCases(problemId);
      
      if (!problem || !testCases) {
        return res.status(404).json({ message: "Problem or test cases not found" });
      }
      
      // If testCaseIndex is provided, execute only that specific test case
      if (testCaseIndex !== undefined && testCaseIndex >= 0 && testCaseIndex < testCases.length) {
        const testCase = testCases[testCaseIndex];
        const result = await runTestCase(code, language, testCase, problem);
        return res.json(result);
      }
      
      // Otherwise, execute against all visible test cases
      const executionResult = await executeCode(code, language, testCases, problem);
      res.json(executionResult);
    } catch (error) {
      console.error("Error executing code:", error);
      res.status(500).json({ message: "Failed to execute code" });
    }
  });

  app.get('/api/submissions/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const submissions = await storage.getUserSubmissions(req.params.userId, req.query.contestId as string);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Leaderboard
  app.get('/api/contests/:contestId/leaderboard', isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getContestLeaderboard(req.params.contestId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Anti-cheating routes
  app.post('/api/contests/:contestId/tab-switch', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      const contestId = req.params.contestId;
      
      await storage.incrementTabSwitches(contestId, userId);
      
      // Check if participant should be disqualified (after 3 tab switches)
      const participants = await storage.getContestParticipants(contestId);
      const participant = participants.find(p => p.userId === userId);
      
      console.log('Tab switch - Participant:', participant);
      console.log('Tab switches:', participant?.tabSwitches);
      
      if (participant && (participant.tabSwitches || 0) >= 3) { // Disqualify after 3rd switch
        console.log('Disqualifying participant:', userId);
        await storage.disqualifyParticipant(contestId, userId);
        
        io.to(`user-${userId}`).emit('disqualified', {
          reason: 'Excessive tab switching',
          contestId
        });
        
        return res.json({ disqualified: true });
      }
      
      res.json({ warning: true, switches: (participant?.tabSwitches || 0) });
    } catch (error) {
      console.error("Error tracking tab switch:", error);
      res.status(500).json({ message: "Failed to track tab switch" });
    }
  });

  app.get('/api/contests/:contestId/participants', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const contestId = req.params.contestId;
      
      // Check if user is admin or contest creator
      const contest = await storage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }
      
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && contest.createdBy !== user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const participants = await storage.getContestParticipants(contestId);
      console.log('Participants data being sent:', participants);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching contest participants:", error);
      res.status(500).json({ message: "Failed to fetch contest participants" });
    }
  });

  app.get('/api/contests/:contestId/disqualified', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not found in session" });
      }
      const contestId = req.params.contestId;
      
      const isDisqualified = await storage.isUserDisqualified(contestId, userId);
      res.json({ isDisqualified });
    } catch (error) {
      console.error("Error checking disqualification status:", error);
      res.status(500).json({ message: "Failed to check disqualification status" });
    }
  });

  app.post('/api/contests/:contestId/allow-retake', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const contestId = req.params.contestId;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      await storage.allowDisqualifiedUserToRetake(contestId, userId);
      res.json({ message: "User allowed to retake contest" });
    } catch (error) {
      console.error("Error allowing user to retake:", error);
      res.status(500).json({ message: "Failed to allow user to retake" });
    }
  });

  // Admin routes for dashboard statistics
  app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/submissions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allSubmissions = await storage.getAllSubmissions();
      res.json(allSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-contest', (contestId: string) => {
      socket.join(`contest-${contestId}`);
      console.log(`User ${socket.id} joined contest ${contestId}`);
    });

    socket.on('join-user-room', (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`User ${socket.id} joined user room ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return httpServer;
}