import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  Trophy,
  Users,
  Lightbulb,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Medal,
  Target,
  BarChart3,
  Pause,
  Wifi,
  WifiOff,
  RefreshCw,
  Code,
  Play,
  Zap,
  BookOpen,
  Eye,
  EyeOff,
  HelpCircle,
  Loader,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import socketManager from "../../utils/socket";
import CheatDetectionManager from "../../utils/cheatDetection";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import ErrorBoundary from "../../components/ErrorBoundary";
import ConnectionStatus from "../../components/ConnectionStatus";
import ErrorFallback from "../../components/ErrorFallback";
import QuestionTypeRouter from "../../components/QuestionTypeRouter";

const GameInterface = () => {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const [participant, setParticipant] = useState(null);
  const [gameState, setGameState] = useState("waiting"); // waiting, active, paused, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [gameAnalytics, setGameAnalytics] = useState(null);
  const [socket, setSocket] = useState(null);
  const [cheatDetection, setCheatDetection] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [prismLoaded, setPrismLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [codeHints, setCodeHints] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTestPreview, setShowTestPreview] = useState(false);

  useEffect(() => {
    initializeGame();

    return () => {
      // Cleanup
      if (cheatDetection) {
        cheatDetection.stopMonitoring();
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Load Prism.js components dynamically
  useEffect(() => {
    const loadPrismComponents = async () => {
      try {
        // Ensure Prism.js components are loaded dynamically
        const clike = await import("prismjs/components/prism-clike");
        const javascript = await import("prismjs/components/prism-javascript");
        const python = await import("prismjs/components/prism-python");
        const java = await import("prismjs/components/prism-java");
        const cpp = await import("prismjs/components/prism-cpp");

        if (!clike || !javascript || !python || !java || !cpp) {
          throw new Error("One or more Prism.js components failed to load.");
        }

        setPrismLoaded(true);
        console.log("Prism.js components loaded successfully");
      } catch (error) {
        console.error("Failed to load Prism.js components:", error);
        setPrismLoaded(false);
      }
    };

    loadPrismComponents();
  }, []);

  // Network connectivity monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network connection restored");
      setNetworkError(null);
      toast.success("Internet connection restored");
      // Attempt to reconnect if we were disconnected
      if (socket && !socket.connected) {
        handleReconnect();
      }
    };

    const handleOffline = () => {
      console.log("Network connection lost");
      setNetworkError("No internet connection");
      toast.error("Internet connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [socket]);

  useEffect(() => {
    let timer;
    console.log("⏱️ Timer useEffect triggered:", {
      timeLeft,
      submitted,
      gameState,
      isPaused,
      currentQuestionId: currentQuestion?.id,
      timestamp: new Date().toISOString()
    });

    if (timeLeft > 0 && !submitted && gameState === "active" && !isPaused) {
      console.log("⏱️ Starting synchronized timer with", timeLeft, "seconds remaining");
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          console.log("⏱️ Timer tick - previous timeLeft:", prev);
          if (prev <= 1) {
            console.log("⏱️ Timer reached zero, triggering server-side auto-submit");
            // Trigger server-side auto-submit instead of client-side
            if (socket && currentQuestion) {
              socket.emit('questionTimeExpired', {
                gameId: participant?.gameId,
                questionId: currentQuestion.id
              });
            }
            autoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (
      timeLeft === 0 &&
      !submitted &&
      gameState === "active" &&
      !isPaused
    ) {
      // Additional check in case timer wasn't running but time is 0
      console.log("⏱️ Time is 0 and not submitted, triggering server-side auto-submit as fallback");
      if (socket && currentQuestion) {
        socket.emit('questionTimeExpired', {
          gameId: participant?.gameId,
          questionId: currentQuestion.id
        });
      }
      autoSubmit();
    } else {
      console.log("⏱️ Timer not started - conditions not met:", {
        timeLeft,
        submitted,
        gameState,
        isPaused
      });
    }
    return () => {
      if (timer) {
        console.log("⏱️ Clearing timer");
        clearInterval(timer);
      }
    };
  }, [timeLeft, submitted, gameState, isPaused, socket, currentQuestion, participant]);

  const initializeGame = useCallback(async () => {
    try {
      console.log("🔄 Initializing game for participant...");
      setConnectionError(null);
      setNetworkError(null);

      // Get session data
      const sessionToken = localStorage.getItem("hackarena_session");
      const participantData = localStorage.getItem("hackarena_participant");

      console.log("📋 Session data check:", {
        hasSessionToken: !!sessionToken,
        hasParticipantData: !!participantData,
        gameCode,
      });

      if (!sessionToken || !participantData) {
        console.log("❌ Session data missing, redirecting to join page");
        toast.error("Session expired. Please join again.");
        navigate(`/join/${gameCode}`);
        return;
      }

      const parsedParticipant = JSON.parse(participantData);
      console.log("👤 Parsed participant data:", parsedParticipant);
      setParticipant(parsedParticipant);

      // Try to rejoin if already in game
      console.log("🔄 Attempting to rejoin game...");
      await rejoinGame(sessionToken);

      // Setup socket connection with enhanced error handling
      console.log("🔌 Connecting to socket...");
      const socketConnection = socketManager.connect();
      setSocket(socketConnection);

      console.log("🔌 Socket connection established:", socketConnection?.id);

      // Add connection status listener
      socketManager.addConnectionListener((event, data) => {
        switch (event) {
          case "connected":
            setConnectionError(null);
            setIsReconnecting(false);
            break;
          case "disconnected":
            setConnectionError("Disconnected from game server");
            break;
          case "error":
            setConnectionError("Connection error occurred");
            break;
          case "reconnecting":
            setIsReconnecting(true);
            break;
          case "reconnected":
            setConnectionError(null);
            setIsReconnecting(false);
            toast.success("Reconnected to game server");
            break;
          case "reconnect_failed":
            setConnectionError("Failed to reconnect to game server");
            setIsReconnecting(false);
            break;
        }
      });

      // Setup cheat detection
      const cheatManager = new CheatDetectionManager((cheatData) => {
        console.log("🚨 Cheat detected:", cheatData);
        socketConnection?.emit("cheatDetected", cheatData);
      });
      setCheatDetection(cheatManager);

      console.log("🎧 Setting up socket listeners...");
      setupSocketListeners(socketConnection, parsedParticipant);

      console.log("✅ Game initialization completed");
    } catch (error) {
      console.error("❌ Failed to initialize game:", error);
      setConnectionError("Failed to connect to game");
      toast.error("Failed to connect to game");

      // If it's a network error, set network error state
      if (!navigator.onLine || error.code === "NETWORK_ERROR") {
        setNetworkError("Network connection error");
      }
    }
  }, [gameCode, navigate]);

  const handleReconnect = useCallback(async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    setRetryCount((prev) => prev + 1);

    try {
      console.log("🔄 Manual reconnection attempt...");

      // Disconnect existing socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      // Reinitialize game
      await initializeGame();

      toast.success("Reconnection successful");
      setRetryCount(0);
    } catch (error) {
      console.error("❌ Reconnection failed:", error);
      toast.error("Reconnection failed");

      if (retryCount < 3) {
        setTimeout(() => handleReconnect(), 2000 * (retryCount + 1));
      }
    } finally {
      setIsReconnecting(false);
    }
  }, [socket, isReconnecting, retryCount, initializeGame]);

  const rejoinGame = useCallback(
    async (sessionToken) => {
      try {
        console.log("🔄 Rejoining game with session token...");
        const response = await api.post(
          "/participants/rejoin",
          {},
          {
            headers: { "x-session-token": sessionToken },
          }
        );

        console.log("📥 Rejoin response:", response.data);
        const {
          participant: updatedParticipant,
          currentQuestion: activeQuestion,
        } = response.data;
        setParticipant(updatedParticipant);

        console.log(
          "🎮 Game status from rejoin:",
          updatedParticipant.gameStatus
        );

        if (activeQuestion) {
          console.log(
            "❓ Active question found during rejoin:",
            activeQuestion
          );
          setCurrentQuestion(activeQuestion);
          setGameState("active");

          // Check if answers are revealed
          const answersRevealed = activeQuestion.answers_revealed;
          console.log("🔍 Answers revealed status:", answersRevealed);

          if (answersRevealed) {
            // If answers are revealed, show the answer immediately
            console.log("✅ Answers revealed, showing correct answer");
            setShowAnswer(true);
            setSubmitted(true); // Mark as submitted since answer is revealed
          } else {
            // Calculate time left only if answers not revealed
            const calculatedTimeLeft = Math.max(
              0,
              Math.floor(
                (new Date(activeQuestion.question_ends_at) - new Date()) / 1000
              )
            );
            console.log(
              "⏱️ Rejoin - Question ends at:",
              activeQuestion.question_ends_at
            );
            console.log("⏱️ Rejoin - Current time:", new Date().toISOString());
            console.log(
              "⏱️ Rejoin - Calculated time left:",
              calculatedTimeLeft
            );
            setTimeLeft(calculatedTimeLeft);
          }
        } else if (updatedParticipant.gameStatus === "completed") {
          console.log("🏁 Game already completed during rejoin");
          setGameState("ended");
          fetchAnalytics();
        } else if (updatedParticipant.gameStatus === "active") {
          console.log(
            "⚠️ Game is active but no current question received - this might be the issue!"
          );
          // Game is active but no question sent - participant should receive current question
          console.log(
            "🔄 Game active but no question - staying in waiting state, expecting gameStarted event"
          );
        } else {
          console.log(
            "⏳ No active question during rejoin, staying in waiting state"
          );
        }
      } catch (error) {
        console.error("❌ Rejoin failed:", error);

        // Handle different types of rejoin errors
        if (error.response?.status === 401) {
          toast.error("Session expired. Please join again.");
          navigate(`/join/${gameCode}`);
        } else if (!navigator.onLine || error.code === "NETWORK_ERROR") {
          setNetworkError("Network error during rejoin");
          toast.error("Network error - will retry automatically");
        } else {
          setConnectionError("Failed to rejoin game");
          toast.error("Failed to rejoin game");
        }

        throw error; // Re-throw to allow caller to handle
      }
    },
    [gameCode, navigate]
  );

  const setupSocketListeners = (socketConnection, participantData) => {
    console.log(
      "🎧 Setting up socket listeners for participant:",
      participantData.id
    );

    // Join participant room
    console.log("🏠 Joining game room with data:", {
      gameCode,
      participantId: participantData.id,
      role: "participant",
    });
    socketConnection.emit("joinGameRoom", {
      gameCode,
      participantId: participantData.id,
      role: "participant",
    });

    // Game started
    socketConnection.on("gameStarted", (data) => {
      console.log("🎮 Game started event received:", data);
      console.log("📊 Current game state before update:", gameState);
      console.log("⏱️ Question time_limit from server:", data.question.time_limit);
      console.log("⏱️ Question question_ends_at from server:", data.question.question_ends_at);

      setCurrentQuestion(data.question);
      setGameState("active");
      // Timer starts counting down from the assigned time when organizer begins question
      setTimeLeft(data.question.time_limit);
      setSubmitted(false);
      setAnswer("");
      setSelectedLanguage(data.question.code_language || "javascript");
      setHintUsed(false);
      setShowHint(false);
      setShowAnswer(false);

      console.log("✅ Game state updated to active");
      console.log("⏱️ Timer started with:", data.question.time_limit, "seconds");
      console.log("❓ Question data:", data.question);

      // Start cheat detection
      if (cheatDetection) {
        console.log("🛡️ Starting cheat detection");
        cheatDetection.startMonitoring();
      }

      toast.success("Game started! Good luck!");
    });

    // Next question
    socketConnection.on("nextQuestion", (data) => {
      console.log("🔄 Next question event received:", data);
      console.log("⏱️ Next question time_limit from server:", data.question.time_limit);
      console.log("⏱️ Next question question_ends_at from server:", data.question.question_ends_at);

      setCurrentQuestion(data.question);
      // Timer starts counting down from the assigned time when organizer begins next question
      setTimeLeft(data.question.time_limit);
      setSubmitted(false);
      setAnswer("");
      setSelectedLanguage(data.question.code_language || "javascript");
      setHintUsed(false);
      setShowHint(false);
      setShowAnswer(false);
      setAnswerResult(null);

      console.log("Next question - Timer started with:", data.question.time_limit, "seconds");
      console.log("Next question - Question data:", data.question);

      toast("Next question!");
    });

    // Answer revealed
    socketConnection.on("answerRevealed", (data) => {
      setShowAnswer(true);
      setTimeout(() => {
        setShowAnswer(false);
      }, 5000);
    });

    // Leaderboard update
    socketConnection.on("leaderboardUpdate", (data) => {
      setLeaderboard(data);
      // Update participant rank
      const participantRank = data.find((p) => p.name === participant?.name);
      if (participantRank && participant) {
        setParticipant((prev) => ({
          ...prev,
          currentRank: participantRank.current_rank,
          totalScore: participantRank.total_score,
        }));
      }
    });

    // Game paused
    socketConnection.on("gamePaused", () => {
      setIsPaused(true);
      toast.info("Game has been paused by the organizer");
    });

    // Game resumed
    socketConnection.on("gameResumed", () => {
      setIsPaused(false);
      toast.success("Game has been resumed!");
    });

    // Game ended
    socketConnection.on("gameEnded", () => {
      setGameState("ended");
      if (cheatDetection) {
        cheatDetection.stopMonitoring();
      }
      fetchAnalytics();
      toast.success("Game completed!");
    });

    // Cheat penalty
    socketConnection.on("cheatPenalty", (data) => {
      setCheatWarnings(data.warningCount);
      toast.error(data.message);
    });

    // Organizer warning
    socketConnection.on("organiserWarning", (data) => {
      toast.error(data.message);
    });

    // Eliminated
    socketConnection.on("eliminated", (data) => {
      toast.error(data.message);
      setGameState("eliminated");
      if (cheatDetection) {
        cheatDetection.stopMonitoring();
      }
    });

    // Re-admitted
    socketConnection.on("reAdmitted", (data) => {
      toast.success(data.message);
      setGameState("waiting");
      // Re-enable cheat detection if game is active
      if (gameState === "active" && cheatDetection) {
        cheatDetection.startMonitoring();
      }
    });

    // Time expired with enhanced synchronization
    socketConnection.on("questionTimeExpired", (data) => {
      console.log("⏰ Received questionTimeExpired event from server:", data);
      console.log("⏰ Current state when time expired:", {
        timeLeft,
        submitted,
        gameState,
        isPaused,
        currentQuestionId: currentQuestion?.id,
        serverTimestamp: data?.timestamp
      });

      // Force timer to zero for visual synchronization
      setTimeLeft(0);

      // Only auto-submit if not already submitted
      if (!submitted) {
        console.log("⏰ Server-triggered auto-submit initiated");
        autoSubmit();
      } else {
        console.log("⏰ Auto-submit skipped - already submitted");
      }
    });
  };

  const validateCodeSubmission = (code, language) => {
    // Allow empty code submissions for auto-submit scenarios
    if (code === null || code === undefined) {
      return { valid: true };
    }

    const maxLength = 50000; // 50KB limit
    if (code.length > maxLength) {
      return { valid: false, error: `Code exceeds maximum length of ${maxLength} characters` };
    }

    // Basic syntax validation for supported languages (only if code is not empty)
    const trimmedCode = code.trim();
    if (trimmedCode.length > 0) {
      if (language === "javascript" && !trimmedCode.includes("function") && !trimmedCode.includes("console.log") && !trimmedCode.includes("return")) {
        return { valid: false, error: "Please write valid JavaScript code" };
      }
      if (language === "python" && !trimmedCode.includes("def ") && !trimmedCode.includes("print(") && !trimmedCode.includes("return ")) {
        return { valid: false, error: "Please write valid Python code" };
      }
      if (language === "java" && !trimmedCode.includes("public class") && !trimmedCode.includes("System.out.println")) {
        return { valid: false, error: "Please write valid Java code" };
      }
      if (language === "cpp" && !trimmedCode.includes("#include") && !trimmedCode.includes("cout")) {
        return { valid: false, error: "Please write valid C++ code" };
      }
    }

    return { valid: true };
  };

  const submitAnswer = useCallback(
    async (isAutoSubmit = false) => {
      if (submitted || !currentQuestion || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const sessionToken = localStorage.getItem("hackarena_session");
        const timeTaken = currentQuestion.time_limit - timeLeft;

        // Validate code submissions (skip for auto-submit with empty answers)
        if (currentQuestion.question_type === "code" && !isAutoSubmit) {
          const validation = validateCodeSubmission(answer, selectedLanguage);
          if (!validation.valid) {
            toast.error(validation.error);
            setIsSubmitting(false);
            return;
          }
        }

        // Handle multiple answers - convert array to comma-separated string for backend
        let finalAnswer = answer;
        if ((currentQuestion.question_type === "multiple" || currentQuestion.question_type === "multiple_choice") && Array.isArray(answer)) {
          finalAnswer = answer.join(',');
        }

        const payload = {
          questionId: currentQuestion.id,
          answer: finalAnswer.trim(),
          language: currentQuestion.question_type === "code" ? selectedLanguage : null,
          hintUsed,
          timeTaken,
          autoSubmit: isAutoSubmit,
        };

        console.log("Submitting answer with payload:", payload);

        const response = await api.post("/participants/answer", payload, {
          headers: { "x-session-token": sessionToken },
        });

        console.log("Submit answer response:", response.data);

        setSubmitted(true);
        setAnswerResult(response.data);

        if (response.data.isCorrect) {
          toast.success(`🎉 Correct! +${response.data.scoreEarned} points`, {
            duration: 4000,
            icon: '🎯'
          });
        } else {
          toast.error("❌ Incorrect answer", {
            duration: 3000
          });
        }
      } catch (error) {
        console.error("Submit answer error:", error);

        // Handle time expired error specifically
        if (error.response?.data?.error === "Question time has expired") {
          console.log("⏰ Time expired error received from server, forcing auto-submit");
          console.log("⏰ Time expired error details:", {
            error: error.response?.data,
            timeLeft,
            submitted,
            currentQuestionId: currentQuestion?.id
          });
          setSubmitted(true);
          setAnswerResult({
            isCorrect: false,
            scoreEarned: 0,
            message: "Time expired - answer submitted automatically",
          });
          toast.error("⏰ Time expired - answer submitted automatically");
          setIsSubmitting(false);
          return;
        }

        // Handle network errors
        if (!navigator.onLine || error.code === "NETWORK_ERROR") {
          setNetworkError("Network error while submitting answer");
          toast.error(
            "🌐 Network error - answer will be submitted when connection is restored"
          );

          // Store answer for retry when connection is restored
          localStorage.setItem(
            "pendingAnswer",
            JSON.stringify({
              payload,
              sessionToken,
              timestamp: Date.now(),
            })
          );

          setIsSubmitting(false);
          return;
        }

        // Handle other API errors
        if (error.response?.status >= 500) {
          toast.error("🔧 Server error - please try again");
        } else if (error.response?.status === 400) {
          toast.error("📝 Invalid answer format");
        } else {
          toast.error("❌ Failed to submit answer");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [submitted, currentQuestion, answer, hintUsed, timeLeft, isSubmitting]
  );

  const autoSubmit = useCallback(() => {
    if (!submitted && currentQuestion) {
      console.log("⏰ Auto-submitting answer due to time expiry");
      console.log("⏰ Auto-submit state:", {
        submitted,
        currentQuestionId: currentQuestion?.id,
        answer,
        timeLeft,
        gameState,
        isPaused,
        timestamp: new Date().toISOString()
      });
      // Force submit with current answer (can be empty)
      console.log("⏰ Auto-submit - Answer to submit:", answer);

      // Emit questionTimeExpired to server to handle synchronized auto-submission
      if (socket) {
        socket.emit('questionTimeExpired', {
          gameId: participant?.gameId,
          questionId: currentQuestion.id
        });
      }

      submitAnswer(true);
    } else {
      console.log("⏰ Auto-submit skipped - conditions not met:", {
        submitted,
        hasCurrentQuestion: !!currentQuestion,
        currentQuestionId: currentQuestion?.id
      });
    }
  }, [submitted, currentQuestion, answer, timeLeft, gameState, isPaused, socket, participant, submitAnswer]);

  const useHint = () => {
    if (!hintUsed && currentQuestion?.hint) {
      setHintUsed(true);
      setShowHint(true);
      toast.info(`Hint revealed! -${currentQuestion.hint_penalty} points`);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const sessionToken = localStorage.getItem("hackarena_session");
      const response = await api.get("/participants/analytics", {
        headers: { "x-session-token": sessionToken },
      });
      setGameAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const validateLanguage = (lang) => {
    const validLanguages = ["javascript", "python", "java", "cpp"];
    return validLanguages.includes(lang) ? lang : "javascript";
  };

  const getLanguageOptions = () => [
    { value: "javascript", label: "JavaScript", icon: "🟨" },
    { value: "python", label: "Python", icon: "🐍" },
    { value: "java", label: "Java", icon: "☕" },
    { value: "cpp", label: "C++", icon: "⚡" }
  ];

  const loadCodeTemplate = (language) => {
    const templates = {
      javascript: `function solution() {
    // Write your JavaScript code here
    // Example: return the sum of two numbers
    console.log("Hello, World!");
}`,
      python: `def solution():
    # Write your Python code here
    # Example: return the sum of two numbers
    print("Hello, World!")`,
      java: `public class Solution {
    public static void main(String[] args) {
        // Write your Java code here
        // Example: print the sum of two numbers
        System.out.println("Hello, World!");
    }
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
    // Example: print the sum of two numbers
    cout << "Hello, World!" << endl;
    return 0;
}`
    };
    return templates[language] || templates.javascript;
  };

  const getCodeHints = (language) => {
    const hints = {
      javascript: [
        "Use console.log() to output results",
        "Remember to handle edge cases",
        "Consider time complexity for large inputs",
        "Use meaningful variable names"
      ],
      python: [
        "Use print() to output results",
        "Python is 0-indexed",
        "Consider using list comprehensions",
        "Handle input parsing carefully"
      ],
      java: [
        "Use System.out.println() to output",
        "Remember to import necessary classes",
        "Handle exceptions with try-catch",
        "Use appropriate data types"
      ],
      cpp: [
        "Use cout to output results",
        "Include necessary headers",
        "Be careful with memory management",
        "Consider algorithm complexity"
      ]
    };
    return hints[language] || hints.javascript;
  };

  const getLanguageHighlight = (lang = "javascript") => {
    if (!prismLoaded || !Prism.languages) {
      return Prism.languages.javascript || null;
    }

    const validLang = validateLanguage(lang);
    switch (validLang) {
      case "javascript":
        return Prism.languages.javascript;
      case "python":
        return Prism.languages.python;
      case "java":
        return Prism.languages.java;
      case "cpp":
        return Prism.languages.cpp;
      default:
        return Prism.languages.javascript;
    }
  };

  const safeHighlight = (code, language) => {
    try {
      if (!prismLoaded || !Prism.languages || !language) {
        return code; // Return plain text if Prism is not ready
      }
      return Prism.highlight(code, language);
    } catch (error) {
      console.error("Prism.js highlighting error:", error);
      return code; // Fallback to plain text
    }
  };


  // Network error screen
  if (networkError) {
    return (
      <ErrorFallback
        type="network"
        onRetry={() => {
          setNetworkError(null);
          handleReconnect();
        }}
        onGoHome={() => navigate("/")}
      />
    );
  }

  // Connection error screen
  if (connectionError && !socket?.connected) {
    return (
      <ErrorFallback
        type="socket"
        onRetry={handleReconnect}
        onGoHome={() => navigate("/")}
      />
    );
  }

  // Eliminated screen
  if (gameState === "eliminated") {
    return (
      <div className="participant-interface min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="animate-pulse mb-8">
            {participant?.avatar && (
              <div className="text-6xl mb-4">{participant.avatar}</div>
            )}
            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Eliminated from DSBA Game
          </h1>
          <p className="text-blue-100 mb-8">
            You have been eliminated from the DSBA hackathon by the organizer.
          </p>
          <div className="card p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <p className="text-white text-sm">
              Waiting for the organizer to re-admit you or for the game to
              end...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (gameState === "waiting") {
    return (
      <ErrorBoundary>
        <ConnectionStatus socket={socket} onReconnect={handleReconnect} />
        <div className="participant-interface min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="animate-bounce mb-8">
              {participant?.avatar && (
                <div className="text-6xl mb-4">{participant.avatar}</div>
              )}
              <Trophy className="h-16 w-16 dsba-accent mx-auto" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome to DSBA HackArena, {participant?.name}!
            </h1>
            <p className="text-blue-100 mb-8">
              Waiting for the DSBA game to start...
            </p>
            <div className="card p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="grid grid-cols-3 gap-4 text-center text-white">
                <div>
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">Ready to compete</p>
                </div>
                <div>
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">Real-time scoring</p>
                </div>
                <div>
                  <Trophy className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">Win prizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Game ended screen
  if (gameState === "ended") {
    return (
      <ErrorBoundary>
        <ConnectionStatus socket={socket} onReconnect={handleReconnect} />
        <div className="participant-interface min-h-screen p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Trophy className="h-16 w-16 dsba-accent mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                DSBA Game Completed!
              </h1>
              <p className="text-blue-100">
                Here's how you performed in the DSBA competition
              </p>
            </div>

            {gameAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Final Stats */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Medal className="h-5 w-5 mr-2 text-yellow-500" />
                    Final Results
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Final Rank:</span>
                      <span className="font-bold text-primary-600">
                        #{gameAnalytics.participant.finalRank}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Score:</span>
                      <span className="font-bold text-green-600">
                        {gameAnalytics.participant.totalScore} points
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy:</span>
                      <span className="font-bold">
                        {gameAnalytics.stats.accuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg. Time:</span>
                      <span className="font-bold">
                        {gameAnalytics.stats.averageTime}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Overview */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                    Performance Overview
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Correct Answers:</span>
                      <span className="font-bold text-green-600">
                        {gameAnalytics.stats.correctAnswers}/
                        {gameAnalytics.stats.totalQuestions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cheat Warnings:</span>
                      <span
                        className={`font-bold ${
                          gameAnalytics.participant.cheatWarnings > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {gameAnalytics.participant.cheatWarnings}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question-wise Performance */}
                <div className="card p-6 md:col-span-2">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-500" />
                    Question-wise Performance
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {gameAnalytics.answers.map((answer, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Question {index + 1}
                          </span>
                          <span className={`flex items-center text-sm ${answer.isCorrect ? "text-green-600" : "text-red-600"}`}>
                            {answer.isCorrect ? (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
                            )}
                            {answer.scoreEarned}/{answer.maxScore} pts
                            {answer.timeBonus > 0 && (
                              <span className="text-blue-500 ml-1">
                                (+{answer.timeBonus} time bonus)
                              </span>
                            )}
                            {answer.partialScore > 0 && (
                              <span className="text-orange-500 ml-1">
                                (+{answer.partialScore} partial)
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {answer.questionText}
                        </p>
                        <div className="text-xs text-gray-500">
                          Your answer:{" "}
                          <span className="font-medium">
                            {answer.yourAnswer}
                          </span>
                          <br />
                          Correct answer:{" "}
                          <span className="font-medium">
                            {answer.correctAnswer}
                          </span>
                          <br />
                          Time taken: {answer.timeTaken}s
                          {answer.hintUsed && (
                            <span className="text-orange-500">
                              {" "}
                              (Hint used)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mt-8 space-x-4">
              <button
                onClick={() => {
                  localStorage.removeItem("hackarena_session");
                  localStorage.removeItem("hackarena_participant");
                  navigate("/");
                }}
                className="btn bg-white text-primary-600 hover:bg-gray-100"
              >
                Exit Game
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Active game screen
  return (
    <ErrorBoundary>
      <div className="participant-interface min-h-screen p-4">
        <ConnectionStatus socket={socket} onReconnect={handleReconnect} />
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="card p-4 mb-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{participant?.avatar}</div>
                <div className="text-white">
                  <p className="font-semibold text-lg">{participant?.name}</p>
                  <p className="text-sm text-blue-100">
                    Rank #{participant?.currentRank || 0} •{" "}
                    {participant?.totalScore || 0} points
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right text-white">
                <div className="flex items-center justify-center sm:justify-end space-x-2 mb-1">
                  <Clock className="h-5 w-5" />
                  <span
                    className={`font-mono text-xl sm:text-lg ${
                      timeLeft <= 10 ? "text-red-300 animate-pulse" : ""
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <p className="text-xs text-blue-100">Countdown timer</p>
              </div>
            </div>

            {cheatWarnings > 0 && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <div className="flex items-center space-x-2 text-red-200">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    {cheatWarnings} warning{cheatWarnings > 1 ? "s" : ""} -
                    Avoid suspicious activities
                  </span>
                </div>
              </div>
            )}

            {isPaused && (
              <div className="mt-3 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                <div className="flex flex-col items-center justify-center space-y-2 text-yellow-200">
                  <div className="flex items-center space-x-2">
                    <Pause className="h-6 w-6" />
                    <span className="text-lg sm:text-xl font-semibold">
                      Game Paused
                    </span>
                  </div>
                  <p className="text-center text-yellow-100 text-sm sm:text-base mt-2">
                    The organizer has paused the game. Please wait for it to
                    resume.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          {currentQuestion && (
            <div className="card p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <h2 className="text-base sm:text-sm font-medium text-gray-600">
                    Question {currentQuestion.question_order}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentQuestion.difficulty?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs sm:text-sm flex items-center">
                    <Code className="h-3 w-3 mr-1" />
                    {currentQuestion.question_type.toUpperCase()}
                  </span>
                  <span className="font-medium flex items-center">
                    <Target className="h-4 w-4 mr-1" />
                    {currentQuestion.marks} points
                  </span>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 leading-relaxed">
                {currentQuestion.question_text}
              </h3>

              {/* Instructions Panel */}
              {currentQuestion.question_type === 'code' && showInstructions && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Quick Tips</h4>
                    </div>
                    <button
                      onClick={() => setShowInstructions(false)}
                      className="text-blue-600 hover:text-blue-800"
                      aria-label="Hide instructions"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-800">
                    {getCodeHints(selectedLanguage).map((hint, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.question_type === 'code' && !showInstructions && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowInstructions(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show coding tips
                  </button>
                </div>
              )}

              {/* Display image for image-based questions */}
              {currentQuestion.question_type === "image" &&
                currentQuestion.image_url && (
                  <div className="mb-4 sm:mb-6">
                    <img
                      src={`http://localhost:3001${currentQuestion.image_url}`}
                      alt="Question"
                      className="max-w-full h-48 sm:h-64 object-contain border rounded-lg shadow-sm"
                    />
                  </div>
                )}

              {/* Answer Input */}
              <div className="mb-4 sm:mb-6">
                <QuestionTypeRouter
                  question={currentQuestion}
                  answer={answer}
                  setAnswer={setAnswer}
                  selectedLanguage={selectedLanguage}
                  setSelectedLanguage={setSelectedLanguage}
                  submitted={submitted}
                  showInstructions={showInstructions}
                  setShowInstructions={setShowInstructions}
                  codeHints={codeHints}
                  setCodeHints={setCodeHints}
                />
              </div>

              {/* Hint */}
              {currentQuestion.hint && (
                <div className="mb-4">
                  {!showHint ? (
                    <button
                      onClick={useHint}
                      disabled={hintUsed}
                      className="btn btn-secondary flex items-center justify-center w-full sm:w-auto min-h-[44px] px-4 py-2 text-base"
                    >
                      <Lightbulb className="h-5 w-5 mr-2" />
                      {hintUsed
                        ? "Hint Used"
                        : `Use Hint (-${currentQuestion.hint_penalty}pts)`}
                    </button>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-yellow-800 text-base">
                            Hint:
                          </p>
                          <p className="text-yellow-700 text-sm sm:text-base leading-relaxed">
                            {currentQuestion.hint}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  {submitted ? (
                    <span className="flex items-center justify-center sm:justify-start text-green-600 font-medium">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      Answer submitted successfully
                    </span>
              ) : (
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start space-x-4 text-sm">
                    <span className={`flex items-center ${
                      currentQuestion?.time_decay_enabled ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      {currentQuestion?.time_decay_enabled ? (
                        <>
                          <Zap className="h-4 w-4 mr-1" />
                          Time decay scoring active - answer faster for higher scores!
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-1" />
                          Answer quickly for bonus points
                        </>
                      )}
                    </span>
                        {currentQuestion?.question_type === 'code' && (
                          <span className="text-gray-500">
                            Press Ctrl+Enter to submit
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => submitAnswer()}
                  disabled={submitted || isSubmitting}
                  className="btn btn-primary flex items-center justify-center w-full sm:w-auto min-h-[44px] px-6 py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : submitted ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submitted
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      {answer.trim() ? 'Submit Answer' : 'Submit (Empty Answer)'}
                    </>
                  )}
                </button>
              </div>

              {/* Answer Result */}
              {answerResult && (
                <div
                  className={`mt-6 p-6 rounded-lg border-2 ${
                    answerResult.isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        answerResult.isCorrect ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {answerResult.isCorrect ? (
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        ) : (
                          <XCircle className="h-8 w-8 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${
                          answerResult.isCorrect ? "text-green-800" : "text-red-800"
                        }`}>
                          {answerResult.isCorrect ? "Correct Answer!" : "Incorrect Answer"}
                        </h4>
                        <p className={`text-sm ${
                          answerResult.isCorrect ? "text-green-700" : "text-red-700"
                        }`}>
                          {answerResult.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {answerResult.isCorrect && (
                        <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
                          <Target className="h-4 w-4 text-green-600" />
                          <span className="text-green-800 font-medium">
                            +{answerResult.scoreEarned} points earned
                          </span>
                        </div>
                      )}

                      {answerResult.timeDecayBonus > 0 && (
                        <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-lg">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-800 font-medium">
                            Time decay bonus: {(answerResult.timeDecayBonus * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {answerResult.partialScore > 0 && (
                        <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-800 font-medium">
                            +{answerResult.partialScore} partial points
                          </span>
                        </div>
                      )}

                      {!answerResult.isCorrect && answerResult.partialScore === 0 && (
                        <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                          <XCircle className="h-4 w-4 text-gray-600" />
                          <span className="text-gray-800 font-medium">
                            0 points earned
                          </span>
                        </div>
                      )}
                    </div>

                    {hintUsed && (
                      <div className="flex items-center space-x-2 text-orange-700 bg-orange-50 px-3 py-2 rounded-lg">
                        <Lightbulb className="h-4 w-4" />
                        <span className="text-sm">
                          Hint was used (-{currentQuestion?.hint_penalty || 10} points penalty)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Answer Reveal */}
          {showAnswer && currentQuestion && (
            <div className="card p-4 sm:p-6 mb-6 border-green-200 bg-green-50">
              <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-3">
                Correct Answer:
              </h3>
              <p className="text-green-700 font-medium mb-3 text-base leading-relaxed">
                {currentQuestion.correct_answer}
              </p>
              {currentQuestion.explanation && (
                <p className="text-green-600 text-sm sm:text-base leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}

          {/* Mini Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
                Live Leaderboard
              </h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((player, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      player.name === participant?.name
                        ? "bg-blue-50 border border-blue-200"
                        : ""
                    }`}
                  >
                    <span className="text-base font-medium text-gray-500 w-8 text-center">
                      #{index + 1}
                    </span>
                    <span className="text-xl">{player.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-base truncate">
                        {player.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {player.total_score} points
                      </p>
                    </div>
                    {player.name === participant?.name && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default GameInterface;
