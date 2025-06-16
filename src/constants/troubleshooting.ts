export const TROUBLE_SHOOTING = {
  GENERAL: `
    🔧 Troubleshooting steps:
        1. Check is Ollama is running:
            - ollama serve
        
        2. Check configuration:
        - ollama-git-commit config show
            
        3. Test connection:
            - ollama-git-commit test connection

        4. Verify host URL format:
            - http://localhost:11434 (local)
            - http://127.0.0.1:11434 (local IP)
            - http://your-server:11434 (remote)
        
        5. Check firewall and network settings:
            - curl http://<host>:<port>/api/tags
        `,
  MODEL_NOT_FOUND: (model: string) =>
    `Model '${model}' is not available.:
    - ollama pull ${model}
    - ollama-git-commit --list-models
    ` as const,
  TIMEOUT: (timeout: number) =>
    `
    🔧 Timeout troubleshooting:
        - Current timeout: ${timeout}ms
        - Try a smaller model for faster response
        - Increase timeout in config file:
            - "timeouts": { "generation": 300000 }
        - Check system resources (CPU/Memory/GPU)
    ` as const,
} as const;

/*


*/
