import {
  users,
  contests,
  problems,
  testCases,
  mcqQuestions,
  submissions,
  contestParticipants,
  type User,
  type UpsertUser,
  type Contest,
  type InsertContest,
  type Problem,
  type InsertProblem,
  type TestCase,
  type InsertTestCase,
  type McqQuestion,
  type InsertMcqQuestion,
  type Submission,
  type InsertSubmission,
  type ContestParticipant,
  type InsertContestParticipant,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;

  // Contest operations
  createContest(contest: InsertContest): Promise<Contest>;
  getContest(id: string): Promise<Contest | undefined>;
  getContests(): Promise<Contest[]>;
  getActiveContests(): Promise<Contest[]>;
  updateContest(id: string, updates: Partial<InsertContest>): Promise<Contest | undefined>;
  deleteContest(id: string): Promise<boolean>;

  // Problem operations
  createProblem(problem: InsertProblem): Promise<Problem>;
  getProblem(id: string): Promise<Problem | undefined>;
  getContestProblems(contestId: string): Promise<Problem[]>;
  updateProblem(id: string, updates: Partial<InsertProblem>): Promise<Problem | undefined>;
  deleteProblem(id: string): Promise<boolean>;

  // Test case operations
  createTestCase(testCase: InsertTestCase): Promise<TestCase>;
  getProblemTestCases(problemId: string): Promise<TestCase[]>;
  getVisibleTestCases(problemId: string): Promise<TestCase[]>;
  updateTestCase(id: string, updates: Partial<InsertTestCase>): Promise<TestCase | undefined>;
  deleteTestCase(id: string): Promise<boolean>;

  // MCQ operations
  createMcqQuestion(mcq: InsertMcqQuestion): Promise<McqQuestion>;
  getMcqQuestion(id: string): Promise<McqQuestion | undefined>;
  getContestMcqQuestions(contestId: string): Promise<McqQuestion[]>;
  updateMcqQuestion(id: string, updates: Partial<InsertMcqQuestion>): Promise<McqQuestion | undefined>;
  deleteMcqQuestion(id: string): Promise<boolean>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | undefined>;
  getUserSubmissions(userId: string, contestId?: string): Promise<Submission[]>;
  getContestSubmissions(contestId: string): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: string, score?: number, executionTime?: number, memoryUsage?: number): Promise<Submission | undefined>;

  // Contest participant operations
  joinContest(participation: InsertContestParticipant): Promise<ContestParticipant>;
  getContestParticipants(contestId: string): Promise<any[]>;
  getContestLeaderboard(contestId: string): Promise<any[]>;
  updateParticipantScore(contestId: string, userId: string, score: number): Promise<void>;
  incrementTabSwitches(contestId: string, userId: string): Promise<void>;
  disqualifyParticipant(contestId: string, userId: string): Promise<void>;
  recalculateAndUpdateParticipantScore(contestId: string, userId: string): Promise<void>;
  getContestParticipant(contestId: string, userId: string): Promise<ContestParticipant | undefined>;
  markContestSubmitted(contestId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.warn("Database connection failed, returning mock users:", error);
      // Return mock data for development
      return [
        {
          id: "mock-user-1",
          username: "admin",
          email: "admin@skillnox.com",
          firstName: "Admin",
          lastName: "User",
          password: "hashed-password",
          role: "admin",
          profileImageUrl: null,
          studentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "mock-user-2",
          username: "student1",
          email: "student1@skillnox.com",
          firstName: "John",
          lastName: "Doe",
          password: "hashed-password",
          role: "student",
          profileImageUrl: null,
          studentId: "STU001",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "mock-user-3",
          username: "student2",
          email: "student2@skillnox.com",
          firstName: "Jane",
          lastName: "Smith",
          password: "hashed-password",
          role: "student",
          profileImageUrl: null,
          studentId: "STU002",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "mock-user-4",
          username: "student3",
          email: "student3@skillnox.com",
          firstName: "Bob",
          lastName: "Johnson",
          password: "hashed-password",
          role: "student",
          profileImageUrl: null,
          studentId: "STU003",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "mock-user-5",
          username: "student4",
          email: "student4@skillnox.com",
          firstName: "Alice",
          lastName: "Brown",
          password: "hashed-password",
          role: "student",
          profileImageUrl: null,
          studentId: "STU004",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
    }
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Contest operations
  async createContest(contest: InsertContest): Promise<Contest> {
    const [newContest] = await db.insert(contests).values(contest).returning();
    return newContest;
  }

  async getContest(id: string): Promise<Contest | undefined> {
    const [contest] = await db.select().from(contests).where(eq(contests.id, id));
    return contest;
  }

  async getContests(): Promise<Contest[]> {
    return await db.select().from(contests).orderBy(desc(contests.createdAt));
  }

  async getActiveContests(): Promise<Contest[]> {
    return await db
      .select()
      .from(contests)
      .where(eq(contests.isActive, true))
      .orderBy(asc(contests.startTime));
  }

  async updateContest(id: string, updates: Partial<InsertContest>): Promise<Contest | undefined> {
    const [updated] = await db
      .update(contests)
      .set(updates)
      .where(eq(contests.id, id))
      .returning();
    return updated;
  }

  async deleteContest(id: string): Promise<boolean> {
    // Delete related records first to avoid foreign key constraint violations
    // Delete in order: submissions, contest_participants, mcq_questions, test_cases, problems, then contests
    
    // Delete submissions
    await db.delete(submissions).where(eq(submissions.contestId, id));
    
    // Delete contest participants
    await db.delete(contestParticipants).where(eq(contestParticipants.contestId, id));
    
    // Delete MCQ questions
    await db.delete(mcqQuestions).where(eq(mcqQuestions.contestId, id));
    
    // Get all problems for this contest first
    const contestProblems = await db
      .select({ id: problems.id })
      .from(problems)
      .where(eq(problems.contestId, id));
    
    // Delete test cases for each problem
    for (const problem of contestProblems) {
      await db.delete(testCases).where(eq(testCases.problemId, problem.id));
    }
    
    // Delete problems
    await db.delete(problems).where(eq(problems.contestId, id));
    
    // Finally delete the contest
    const result = await db.delete(contests).where(eq(contests.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Problem operations
  async createProblem(problem: InsertProblem): Promise<Problem> {
    const [newProblem] = await db.insert(problems).values(problem).returning();
    return newProblem;
  }

  async getProblem(id: string): Promise<Problem | undefined> {
    const [problem] = await db.select().from(problems).where(eq(problems.id, id));
    return problem;
  }

  async getContestProblems(contestId: string): Promise<Problem[]> {
    const problemsList = await db
      .select()
      .from(problems)
      .where(eq(problems.contestId, contestId))
      .orderBy(asc(problems.orderIndex));
    
    // Fetch test cases for each problem
    const problemsWithTestCases = await Promise.all(
      problemsList.map(async (problem) => {
        const testCases = await this.getProblemTestCases(problem.id);
        return {
          ...problem,
          testCases
        };
      })
    );
    
    return problemsWithTestCases;
  }

  async updateProblem(id: string, updates: Partial<InsertProblem>): Promise<Problem | undefined> {
    const [updated] = await db
      .update(problems)
      .set(updates)
      .where(eq(problems.id, id))
      .returning();
    return updated;
  }

  async deleteProblem(id: string): Promise<boolean> {
    const result = await db.delete(problems).where(eq(problems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Test case operations
  async createTestCase(testCase: InsertTestCase): Promise<TestCase> {
    const [newTestCase] = await db.insert(testCases).values(testCase).returning();
    return newTestCase;
  }

  async getProblemTestCases(problemId: string): Promise<TestCase[]> {
    return await db
      .select()
      .from(testCases)
      .where(eq(testCases.problemId, problemId))
      .orderBy(asc(testCases.orderIndex));
  }

  async getVisibleTestCases(problemId: string): Promise<TestCase[]> {
    return await db
      .select()
      .from(testCases)
      .where(and(eq(testCases.problemId, problemId), eq(testCases.isVisible, true)))
      .orderBy(asc(testCases.orderIndex));
  }

  async updateTestCase(id: string, updates: Partial<InsertTestCase>): Promise<TestCase | undefined> {
    const [updatedTestCase] = await db
      .update(testCases)
      .set(updates)
      .where(eq(testCases.id, id))
      .returning();
    return updatedTestCase;
  }

  async deleteTestCase(id: string): Promise<boolean> {
    const result = await db.delete(testCases).where(eq(testCases.id, id));
    return (result.rowCount || 0) > 0;
  }

  // MCQ operations
  async createMcqQuestion(mcq: InsertMcqQuestion): Promise<McqQuestion> {
    const [newMcq] = await db.insert(mcqQuestions).values(mcq).returning();
    return newMcq;
  }

  async getMcqQuestion(id: string): Promise<McqQuestion | undefined> {
    const [mcq] = await db.select().from(mcqQuestions).where(eq(mcqQuestions.id, id));
    return mcq;
  }

  async getContestMcqQuestions(contestId: string): Promise<McqQuestion[]> {
    return await db
      .select()
      .from(mcqQuestions)
      .where(eq(mcqQuestions.contestId, contestId))
      .orderBy(asc(mcqQuestions.orderIndex));
  }

  async updateMcqQuestion(id: string, updates: Partial<InsertMcqQuestion>): Promise<McqQuestion | undefined> {
    const [updated] = await db
      .update(mcqQuestions)
      .set(updates)
      .where(eq(mcqQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteMcqQuestion(id: string): Promise<boolean> {
    const result = await db.delete(mcqQuestions).where(eq(mcqQuestions.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Submission operations
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async getUserSubmissions(userId: string, contestId?: string): Promise<Submission[]> {
    if (contestId) {
      return await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.userId, userId), eq(submissions.contestId, contestId)))
        .orderBy(desc(submissions.submittedAt));
    } else {
      return await db
        .select()
        .from(submissions)
        .where(eq(submissions.userId, userId))
        .orderBy(desc(submissions.submittedAt));
    }
  }

  async getContestSubmissions(contestId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.contestId, contestId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.submittedAt));
  }

  async updateSubmissionStatus(
    id: string,
    status: string,
    score?: number,
    executionTime?: number,
    memoryUsage?: number
  ): Promise<Submission | undefined> {
    const updates: any = { status };
    if (score !== undefined) updates.score = score;
    if (executionTime !== undefined) updates.executionTime = executionTime;
    if (memoryUsage !== undefined) updates.memoryUsage = memoryUsage;

    const [updated] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  // Contest participant operations
  async joinContest(participation: InsertContestParticipant): Promise<ContestParticipant> {
    const [newParticipant] = await db
      .insert(contestParticipants)
      .values(participation)
      .onConflictDoNothing()
      .returning();
    return newParticipant;
  }

  async getContestParticipants(contestId: string): Promise<any[]> {
    return await db
      .select({
        id: contestParticipants.id,
        contestId: contestParticipants.contestId,
        userId: contestParticipants.userId,
        totalScore: contestParticipants.totalScore,
        submittedAt: contestParticipants.submittedAt,
        joinedAt: contestParticipants.joinedAt,
        isDisqualified: contestParticipants.isDisqualified,
        tabSwitches: contestParticipants.tabSwitches,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          studentId: users.studentId,
        }
      })
      .from(contestParticipants)
      .innerJoin(users, eq(contestParticipants.userId, users.id))
      .where(eq(contestParticipants.contestId, contestId));
  }

  async getContestLeaderboard(contestId: string): Promise<any[]> {
    const result = await db
      .select({
        userId: contestParticipants.userId,
        totalScore: contestParticipants.totalScore,
        submittedAt: contestParticipants.submittedAt,
        joinedAt: contestParticipants.joinedAt,
        isDisqualified: contestParticipants.isDisqualified,
        firstName: users.firstName,
        lastName: users.lastName,
        studentId: users.studentId,
        email: users.email,
      })
      .from(contestParticipants)
      .innerJoin(users, eq(contestParticipants.userId, users.id))
      .where(eq(contestParticipants.contestId, contestId))
      .orderBy(desc(contestParticipants.totalScore), asc(contestParticipants.submittedAt));

    return result;
  }

  async updateParticipantScore(contestId: string, userId: string, score: number): Promise<void> {
    await db
      .update(contestParticipants)
      .set({ totalScore: score })
      .where(
        and(
          eq(contestParticipants.contestId, contestId),
          eq(contestParticipants.userId, userId)
        )
      );
  }

  async incrementTabSwitches(contestId: string, userId: string): Promise<void> {
    await db
      .update(contestParticipants)
      .set({ 
        tabSwitches: sql`${contestParticipants.tabSwitches} + 1`
      })
      .where(
        and(
          eq(contestParticipants.contestId, contestId),
          eq(contestParticipants.userId, userId)
        )
      );
  }

  async disqualifyParticipant(contestId: string, userId: string): Promise<void> {
    await db
      .update(contestParticipants)
      .set({ isDisqualified: true })
      .where(
        and(
          eq(contestParticipants.contestId, contestId),
          eq(contestParticipants.userId, userId)
        )
      );
  }

  // Recalculate total score as sum of best score per problem for this participant within the contest
  async recalculateAndUpdateParticipantScore(contestId: string, userId: string): Promise<void> {
    // Get all submissions for this user and contest
    const userSubs = await db
      .select({ problemId: submissions.problemId, score: submissions.score })
      .from(submissions)
      .where(and(eq(submissions.contestId, contestId), eq(submissions.userId, userId)));

    // Group by problemId and take max score per problem
    const bestByProblem = new Map<string, number>();
    for (const sub of userSubs) {
      const key = sub.problemId || '';
      if (!key) continue;
      const prev = bestByProblem.get(key) ?? 0;
      const val = typeof sub.score === 'number' ? sub.score : 0;
      if (val > prev) bestByProblem.set(key, val);
    }

    let total = 0;
    for (const v of bestByProblem.values()) total += v;

    await this.updateParticipantScore(contestId, userId, total);
  }

  async getContestParticipant(contestId: string, userId: string): Promise<ContestParticipant | undefined> {
    const [participant] = await db
      .select()
      .from(contestParticipants)
      .where(and(eq(contestParticipants.contestId, contestId), eq(contestParticipants.userId, userId)));
    return participant;
  }

  async markContestSubmitted(contestId: string, userId: string): Promise<void> {
    await db
      .update(contestParticipants)
      .set({ submittedAt: new Date() })
      .where(and(eq(contestParticipants.contestId, contestId), eq(contestParticipants.userId, userId)));
  }

  async isUserDisqualified(contestId: string, userId: string): Promise<boolean> {
    const [participant] = await db
      .select({ isDisqualified: contestParticipants.isDisqualified })
      .from(contestParticipants)
      .where(
        and(
          eq(contestParticipants.contestId, contestId),
          eq(contestParticipants.userId, userId)
        )
      );
    
    return participant?.isDisqualified || false;
  }

  async allowDisqualifiedUserToRetake(contestId: string, userId: string): Promise<void> {
    await db
      .update(contestParticipants)
      .set({ 
        isDisqualified: false,
        tabSwitches: 0,
        totalScore: 0,
        submittedAt: null
      })
      .where(
        and(
          eq(contestParticipants.contestId, contestId),
          eq(contestParticipants.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
