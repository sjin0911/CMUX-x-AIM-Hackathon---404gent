export const defaultRules = [
  {
    id: "prompt.ignore-instructions",
    appliesTo: ["prompt"],
    severity: "high",
    category: "prompt_injection",
    pattern: "\\b(ignore|disregard|forget|override)\\b.{0,80}\\b(previous|prior|system|developer|instruction|instructions|rules)\\b",
    rationale: "Prompt appears to override higher-priority instructions.",
    remediation: "Remove instruction-override language before sending it to an agent."
  },
  {
    id: "prompt.ignore-instructions-ko",
    appliesTo: ["prompt"],
    severity: "high",
    category: "prompt_injection",
    pattern: "(이전|앞선|기존).{0,30}(지시|명령|규칙).{0,30}(무시|잊어|삭제|덮어써|우회)|(무시|잊어|삭제|덮어써|우회).{0,30}(이전|앞선|기존).{0,30}(지시|명령|규칙)",
    rationale: "Korean prompt appears to override higher-priority instructions.",
    remediation: "Remove instruction-override language before sending it to an agent."
  },
  {
    id: "prompt.roleplay-jailbreak",
    appliesTo: ["prompt"],
    severity: "high",
    category: "prompt_injection",
    pattern: "\\b(DAN|developer mode|jailbreak|do anything now|uncensored|no restrictions|bypass safety|disable safety)\\b",
    rationale: "Prompt uses common jailbreak or role-play bypass language.",
    remediation: "Reject jailbreak framing and restate the safe task."
  },
  {
    id: "prompt.system-prompt-disclosure",
    appliesTo: ["prompt"],
    severity: "high",
    category: "prompt_injection",
    pattern: "\\b(system prompt|developer message|hidden instruction|policy text|internal prompt|chain of thought|reasoning trace)\\b.{0,80}\\b(show|print|reveal|dump|leak|verbatim|full)\\b|\\b(show|print|reveal|dump|leak)\\b.{0,80}\\b(system prompt|developer message|hidden instruction|policy text|internal prompt|chain of thought|reasoning trace)\\b",
    rationale: "Prompt requests hidden prompts, policies, or private reasoning.",
    remediation: "Do not reveal hidden instructions or private reasoning."
  },
  {
    id: "prompt.exfiltrate-secrets",
    appliesTo: ["prompt"],
    severity: "high",
    category: "secret_exfiltration",
    pattern: "\\b(print|dump|show|reveal|send|upload|exfiltrate)\\b.{0,80}\\b(\\.env|secret|secrets|api key|token|password|private key|id_rsa)\\b",
    rationale: "Prompt asks the agent to reveal or transmit sensitive data.",
    remediation: "Refuse the exfiltration request and ask for a safe, scoped alternative."
  },
  {
    id: "prompt.exfiltrate-secrets-ko",
    appliesTo: ["prompt"],
    severity: "high",
    category: "secret_exfiltration",
    pattern: "(출력|보여|덤프|전송|업로드|유출).{0,50}(\\.env|시크릿|비밀|토큰|비밀번호|개인키|API.?키)",
    rationale: "Korean prompt asks the agent to reveal or transmit sensitive data.",
    remediation: "Refuse the exfiltration request and ask for a safe, scoped alternative."
  },
  {
    id: "prompt.tool-bypass",
    appliesTo: ["prompt"],
    severity: "medium",
    category: "tool_misuse",
    pattern: "\\b(without asking|do not ask|silently|no confirmation)\\b.{0,80}\\b(run|execute|shell|terminal|command)\\b",
    rationale: "Prompt asks for tool execution without normal confirmation.",
    remediation: "Require explicit approval for commands with side effects."
  },
  {
    id: "prompt.guardrail-tampering",
    appliesTo: ["prompt"],
    severity: "high",
    category: "guardrail_tampering",
    pattern: "\\b(disable|remove|bypass|turn off|patch out)\\b.{0,80}\\b(guardrail|safety check|policy engine|scanner|monitor|404gent|cmux notify)\\b",
    rationale: "Prompt asks the agent to weaken or remove monitoring.",
    remediation: "Keep guardrails enabled and require human approval for policy changes."
  },
  {
    id: "prompt.malware-abuse",
    appliesTo: ["prompt"],
    severity: "high",
    category: "malware_or_abuse",
    pattern: "\\b(ransomware|keylogger|credential stealer|steal cookies|reverse shell|botnet|malware|trojan|worm)\\b",
    rationale: "Prompt requests or discusses common malware capabilities.",
    remediation: "Allow only benign defensive analysis with scoped artifacts."
  },
  {
    id: "prompt.phishing-social-engineering",
    appliesTo: ["prompt"],
    severity: "high",
    category: "social_engineering",
    pattern: "\\b(phishing|spoof login|fake login|credential capture|steal credentials|session hijack)\\b",
    rationale: "Prompt appears to request credential theft or social engineering.",
    remediation: "Reject credential-harvesting tasks and limit work to defensive education."
  },
  {
    id: "prompt.data-poisoning-backdoor",
    appliesTo: ["prompt"],
    severity: "high",
    category: "backdoor_or_poisoning",
    pattern: "\\b(backdoor|logic bomb|sleeper agent|poison the dataset|poison training|hidden trigger)\\b",
    rationale: "Prompt may ask for hidden malicious behavior or poisoned data.",
    remediation: "Require explicit, reviewable behavior and remove hidden triggers."
  },
  {
    id: "prompt.pii-harvest",
    appliesTo: ["prompt"],
    severity: "high",
    category: "privacy_abuse",
    pattern: "\\b(scrape|harvest|dump|collect)\\b.{0,80}\\b(SSN|social security|credit card|phone numbers|emails|PII|personal data)\\b",
    rationale: "Prompt requests bulk collection of personal data.",
    remediation: "Minimize personal data collection and require consent or synthetic data."
  },
  {
    id: "command.destructive-root-delete",
    appliesTo: ["command"],
    severity: "critical",
    category: "destructive_command",
    pattern: "\\brm\\s+-[A-Za-z]*[rR][A-Za-z]*[fF]?[A-Za-z]*\\s+(\\/|~|\\$HOME)(\\s|$)",
    rationale: "Command may recursively delete a root or home directory.",
    remediation: "Use a scoped path and confirm it is inside the project workspace."
  },
  {
    id: "command.destructive-workspace-delete",
    appliesTo: ["command"],
    severity: "high",
    category: "destructive_command",
    pattern: "\\brm\\s+-[A-Za-z]*[rR][A-Za-z]*[fF]?[A-Za-z]*\\s+(\\.|\\.\\/|\\*)\\s*($|[;&|])",
    rationale: "Command may recursively delete the current workspace.",
    remediation: "Target an explicit safe path and confirm the intended files."
  },
  {
    id: "command.disk-destruction",
    appliesTo: ["command"],
    severity: "critical",
    category: "destructive_command",
    pattern: "\\b(mkfs|fdisk|diskutil\\s+erase|dd\\s+if=)\\b",
    rationale: "Command can destroy disks or filesystems.",
    remediation: "Block disk mutation commands in hackathon demo environments."
  },
  {
    id: "command.fork-bomb",
    appliesTo: ["command"],
    severity: "critical",
    category: "denial_of_service",
    pattern: "\\:\\(\\)\\s*\\{\\s*\\:\\|\\:\\&\\s*\\}\\s*;\\s*\\:|\\byes\\b.{0,30}\\|.{0,30}\\byes\\b",
    rationale: "Command resembles a fork bomb or local denial-of-service pattern.",
    remediation: "Do not run resource-exhaustion commands."
  },
  {
    id: "command.git-history-destruction",
    appliesTo: ["command"],
    severity: "high",
    category: "destructive_command",
    pattern: "\\bgit\\s+(reset\\s+--hard|clean\\s+-[A-Za-z]*[dD][A-Za-z]*[fF][A-Za-z]*[xX]?|checkout\\s+--\\s+\\.)\\b",
    rationale: "Command can erase local, uncommitted work.",
    remediation: "Inspect git status and preserve user changes before destructive git operations."
  },
  {
    id: "command.env-to-network",
    appliesTo: ["command"],
    severity: "high",
    category: "secret_exfiltration",
    pattern: "(cat|printenv|env|grep).{0,120}(\\.env|API_KEY|TOKEN|SECRET|PASSWORD).{0,120}(curl|wget|nc|ncat|scp|rsync)",
    rationale: "Command appears to send environment secrets to a network destination.",
    remediation: "Do not pipe secrets into network tools."
  },
  {
    id: "command.sensitive-file-to-network",
    appliesTo: ["command"],
    severity: "high",
    category: "secret_exfiltration",
    pattern: "\\b(curl|wget|nc|ncat|scp|rsync|ftp|sftp)\\b.{0,120}\\b(\\.env|id_rsa|id_ed25519|\\.pem|\\.p12|\\.kube/config|credentials|secrets?\\.json|service-account)\\b|\\b(\\.env|id_rsa|id_ed25519|\\.pem|\\.p12|\\.kube/config|credentials|secrets?\\.json|service-account)\\b.{0,120}\\b(curl|wget|nc|ncat|scp|rsync|ftp|sftp)\\b",
    rationale: "Command appears to transfer sensitive local files.",
    remediation: "Never upload credential files without explicit human approval."
  },
  {
    id: "command.secret-file-read",
    appliesTo: ["command"],
    severity: "medium",
    category: "secret_discovery",
    pattern: "\\b(cat|less|more|grep|rg|find|ls)\\b.{0,100}\\b(\\.env|id_rsa|id_ed25519|\\.npmrc|\\.pypirc|\\.netrc|\\.kube/config|credentials|secrets?\\.json|service-account)\\b",
    rationale: "Command reads files that commonly contain secrets.",
    remediation: "Confirm the read is necessary and redact any output."
  },
  {
    id: "command.network-to-shell",
    appliesTo: ["command"],
    severity: "high",
    category: "remote_code_execution",
    pattern: "\\b(curl|wget)\\b.{0,160}(\\||>)\\s*(sh|bash|zsh|python|node)\\b",
    rationale: "Command downloads remote code and executes it directly.",
    remediation: "Download, inspect, pin, and verify code before execution."
  },
  {
    id: "command.reverse-shell",
    appliesTo: ["command"],
    severity: "critical",
    category: "remote_code_execution",
    pattern: "\\b(nc|ncat|netcat)\\b.{0,80}\\b(-e|/bin/(sh|bash))\\b|/dev/tcp/[A-Za-z0-9._-]+/\\d+|mkfifo\\s+/tmp/",
    rationale: "Command resembles a reverse shell or remote interactive shell.",
    remediation: "Block reverse shell patterns unless running in an isolated security lab."
  },
  {
    id: "command.persistence-shell-profile",
    appliesTo: ["command"],
    severity: "high",
    category: "persistence",
    pattern: "\\b(echo|printf|cat|tee)\\b.{0,120}(>>|>)\\s*(~\\/)?\\.(bashrc|zshrc|profile|bash_profile)|\\bcrontab\\s+(-|/tmp/|/var/tmp/)",
    rationale: "Command may add persistence through shell startup files or cron.",
    remediation: "Require review before modifying shell startup or scheduled task files."
  },
  {
    id: "command.permission-broadening",
    appliesTo: ["command"],
    severity: "medium",
    category: "unsafe_permission",
    pattern: "\\bchmod\\s+-R\\s+777\\b",
    rationale: "Command recursively grants world-writable permissions.",
    remediation: "Grant the minimum required permission to the minimum required path."
  },
  {
    id: "command.privilege-escalation",
    appliesTo: ["command"],
    severity: "high",
    category: "privilege_escalation",
    pattern: "\\bsudo\\s+(su|bash|sh|zsh|python|node)\\b|\\bchmod\\s+u\\+s\\b",
    rationale: "Command attempts to open a privileged shell or set SUID permissions.",
    remediation: "Use narrowly scoped privileged commands and avoid privileged shells."
  },
  {
    id: "command.network-scan",
    appliesTo: ["command"],
    severity: "medium",
    category: "reconnaissance",
    pattern: "\\b(nmap|masscan|zmap|nikto|sqlmap|hydra|ffuf|gobuster|dirsearch)\\b",
    rationale: "Command runs a network or web reconnaissance tool.",
    remediation: "Run scanning only against authorized targets."
  },
  {
    id: "command.credential-attack-tool",
    appliesTo: ["command"],
    severity: "high",
    category: "credential_attack",
    pattern: "\\b(hashcat|john|aircrack-ng|mimikatz|secretsdump|crackmapexec)\\b",
    rationale: "Command invokes a common credential attack tool.",
    remediation: "Allow only authorized defensive testing in an isolated environment."
  },
  {
    id: "command.docker-privileged",
    appliesTo: ["command"],
    severity: "high",
    category: "container_escape_risk",
    pattern: "\\bdocker\\s+run\\b.{0,160}(--privileged|--pid=host|--network=host|--net=host|/var/run/docker\\.sock)",
    rationale: "Command starts a container with host-level privileges or Docker socket access.",
    remediation: "Remove privileged container options unless explicitly required."
  },
  {
    id: "command.docker-destructive",
    appliesTo: ["command"],
    severity: "high",
    category: "destructive_command",
    pattern: "\\bdocker\\s+(system\\s+prune\\b.{0,80}-a|volume\\s+rm|volume\\s+prune|container\\s+prune|image\\s+prune)",
    rationale: "Command can remove containers, images, volumes, or cached data.",
    remediation: "Confirm disposable resources before destructive Docker cleanup."
  },
  {
    id: "command.kubernetes-destructive",
    appliesTo: ["command"],
    severity: "high",
    category: "destructive_infra",
    pattern: "\\bkubectl\\s+delete\\s+(namespace|ns|all|pods?|deployments?|services?|secrets?|configmaps?)\\b.{0,120}(--all|-A|--all-namespaces|\\*)",
    rationale: "Command can delete many Kubernetes resources.",
    remediation: "Require namespace scoping and explicit resource names before deletion."
  },
  {
    id: "command.terraform-destroy",
    appliesTo: ["command"],
    severity: "high",
    category: "destructive_infra",
    pattern: "\\b(terraform|tofu)\\s+(destroy|apply\\s+-destroy)\\b",
    rationale: "Command destroys infrastructure managed by Terraform or OpenTofu.",
    remediation: "Require a reviewed plan and human approval before infrastructure destruction."
  },
  {
    id: "command.aws-destructive",
    appliesTo: ["command"],
    severity: "critical",
    category: "destructive_cloud",
    pattern: "\\baws\\b.{0,120}\\b(s3\\s+rm\\b.{0,80}--recursive|ec2\\s+terminate-instances|rds\\s+delete-db-instance|iam\\s+delete-|eks\\s+delete-cluster)\\b",
    rationale: "Command can delete or terminate AWS resources.",
    remediation: "Require account, region, and resource confirmation before destructive cloud commands."
  },
  {
    id: "command.gcloud-destructive",
    appliesTo: ["command"],
    severity: "critical",
    category: "destructive_cloud",
    pattern: "\\bgcloud\\b.{0,120}\\b(projects\\s+delete|compute\\s+instances\\s+delete|container\\s+clusters\\s+delete|sql\\s+instances\\s+delete)\\b",
    rationale: "Command can delete GCP projects, compute, container, or SQL resources.",
    remediation: "Require project and resource confirmation before destructive cloud commands."
  },
  {
    id: "command.azure-destructive",
    appliesTo: ["command"],
    severity: "critical",
    category: "destructive_cloud",
    pattern: "\\baz\\b.{0,120}\\b(group\\s+delete|vm\\s+delete|aks\\s+delete|storage\\s+account\\s+delete|ad\\s+app\\s+delete)\\b",
    rationale: "Command can delete Azure groups, compute, Kubernetes, storage, or app resources.",
    remediation: "Require subscription and resource confirmation before destructive cloud commands."
  },
  {
    id: "command.database-destructive",
    appliesTo: ["command"],
    severity: "high",
    category: "destructive_database",
    pattern: "\\b(drop\\s+database|drop\\s+table|truncate\\s+table|delete\\s+from\\s+[A-Za-z0-9_.\"`]+\\s*(;|$))",
    rationale: "Command contains destructive SQL without obvious safeguards.",
    remediation: "Require backups, transaction strategy, and scoped WHERE clauses."
  },
  {
    id: "command.package-remote-install",
    appliesTo: ["command"],
    severity: "medium",
    category: "supply_chain_risk",
    pattern: "\\b(npm|pnpm|yarn)\\s+(install|add|dlx|exec)\\b.{0,160}(https?:\\/\\/|git\\+|github:|gist\\.github)|\\bpip\\s+install\\b.{0,160}(https?:\\/\\/|git\\+)",
    rationale: "Command installs or executes package code directly from a remote URL.",
    remediation: "Pin versions and inspect package provenance before installation."
  },
  {
    id: "command.package-publish",
    appliesTo: ["command"],
    severity: "medium",
    category: "supply_chain_risk",
    pattern: "\\b(npm|pnpm|yarn)\\s+publish\\b|\\btwine\\s+upload\\b",
    rationale: "Command publishes package artifacts to a registry.",
    remediation: "Confirm package contents, version, registry, and credentials before publishing."
  },
  {
    id: "command.git-add-secret",
    appliesTo: ["command"],
    severity: "high",
    category: "secret_leak",
    pattern: "\\bgit\\s+add\\b.{0,120}(\\.env|id_rsa|id_ed25519|\\.pem|\\.p12|\\.npmrc|\\.pypirc|\\.netrc|secrets?\\.json|service-account)",
    rationale: "Command may stage secrets for commit.",
    remediation: "Remove secret files from git and use secret scanning before commit."
  },
  {
    id: "command.git-force-push",
    appliesTo: ["command"],
    severity: "medium",
    category: "destructive_git",
    pattern: "\\bgit\\s+push\\b.{0,120}(--force|-f|--mirror)",
    rationale: "Command can rewrite or overwrite remote git history.",
    remediation: "Use force-with-lease and confirm branch ownership before pushing."
  },
  {
    id: "command.credential-helper-store",
    appliesTo: ["command"],
    severity: "medium",
    category: "credential_storage",
    pattern: "\\bgit\\s+config\\b.{0,120}credential\\.helper\\s+store\\b",
    rationale: "Command configures git to store credentials on disk.",
    remediation: "Prefer OS keychain or short-lived credentials."
  },
  {
    id: "os.sensitive-file-open",
    appliesTo: ["os"],
    severity: "high",
    category: "secret_discovery",
    pattern: "\\bos\\s+open\\b.{0,160}\\bpath=(\"[^\"]*(\\.env|id_rsa|id_ed25519|\\.npmrc|\\.pypirc|\\.netrc|\\.kube/config|credentials|secrets?\\.json|service-account)[^\"]*\"|\\S*(\\.env|id_rsa|id_ed25519|\\.npmrc|\\.pypirc|\\.netrc|\\.kube/config|credentials|secrets?\\.json|service-account)\\S*)",
    rationale: "OS Guard observed a process opening a file that commonly contains credentials.",
    remediation: "Deny the file open unless a human explicitly approved secret access."
  },
  {
    id: "os.private-key-open",
    appliesTo: ["os"],
    severity: "high",
    category: "secret_discovery",
    pattern: "\\bos\\s+open\\b.{0,160}\\bpath=(\"[^\"]*\\.(pem|p12|key)[^\"]*\"|\\S*\\.(pem|p12|key)\\S*)",
    rationale: "OS Guard observed access to a private key or certificate file.",
    remediation: "Require review before allowing key material to be read by an agent process."
  },
  {
    id: "os.network-tool-exec",
    appliesTo: ["os"],
    severity: "medium",
    category: "network_transfer",
    pattern: "\\bos\\s+exec\\b.{0,160}\\bargv=\"?(curl|wget|nc|ncat|netcat|scp|rsync|ftp|sftp)\\b[^\"\\n]*\"?",
    rationale: "OS Guard observed execution of a network transfer tool.",
    remediation: "Confirm the destination and payload before allowing network transfer."
  },
  {
    id: "os.destructive-exec",
    appliesTo: ["os"],
    severity: "high",
    category: "destructive_command",
    pattern: "\\bos\\s+exec\\b.{0,160}\\bargv=\"?(rm\\s+-[A-Za-z]*[rR][A-Za-z]*[fF]?|dd\\b|mkfs\\b|diskutil\\s+erase)[^\"\\n]*\"?",
    rationale: "OS Guard observed execution of a destructive filesystem or disk tool.",
    remediation: "Block destructive execution unless the target is scoped and reviewed."
  },
  {
    id: "os.reverse-shell-exec",
    appliesTo: ["os"],
    severity: "critical",
    category: "remote_code_execution",
    pattern: "\\bos\\s+exec\\b.{0,220}(/dev/tcp/[A-Za-z0-9._-]+/\\d+|\\b(nc|ncat|netcat)\\b.{0,80}\\b(-e|/bin/(sh|bash))\\b|mkfifo\\s+/tmp/)",
    rationale: "OS Guard observed process arguments resembling a reverse shell.",
    remediation: "Block reverse shell execution outside an isolated security lab."
  },
  {
    id: "output.private-key",
    appliesTo: ["output"],
    severity: "critical",
    category: "secret_leak",
    pattern: "-----BEGIN ([A-Z0-9 ]+ )?PRIVATE KEY-----",
    rationale: "Output contains a private key header.",
    remediation: "Redact output and rotate the exposed key."
  },
  {
    id: "output.cloud-key",
    appliesTo: ["output"],
    severity: "critical",
    category: "secret_leak",
    pattern: "\\b(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|npm_[A-Za-z0-9]{36}|sk-[A-Za-z0-9_-]{24,})\\b",
    rationale: "Output resembles a cloud, source control, package, Slack, or LLM API key.",
    remediation: "Redact output and rotate the exposed credential."
  },
  {
    id: "output.env-assignment",
    appliesTo: ["output"],
    severity: "high",
    category: "secret_leak",
    pattern: "\\b[A-Z0-9_]*(API_KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\\s*=\\s*['\\\"]?[A-Za-z0-9_./+=:-]{12,}",
    rationale: "Output contains a likely secret assignment.",
    remediation: "Redact output before it leaves the terminal guard."
  },
  {
    id: "output.bearer-token",
    appliesTo: ["output"],
    severity: "high",
    category: "secret_leak",
    pattern: "\\bBearer\\s+[A-Za-z0-9._~+/-]+=*\\b",
    rationale: "Output contains a bearer token.",
    remediation: "Redact output and rotate the exposed token."
  },
  {
    id: "output.jwt",
    appliesTo: ["output"],
    severity: "high",
    category: "secret_leak",
    pattern: "\\beyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b",
    rationale: "Output contains a likely JSON Web Token.",
    remediation: "Redact output and invalidate the exposed session if needed."
  },
  {
    id: "output.connection-string",
    appliesTo: ["output"],
    severity: "high",
    category: "secret_leak",
    pattern: "\\b(postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis):\\/\\/[^\\s\"']+:[^\\s\"']+@[^\\s\"']+",
    rationale: "Output contains a database or cache connection string with credentials.",
    remediation: "Redact output and rotate the exposed database credential."
  },
  {
    id: "output.session-cookie",
    appliesTo: ["output"],
    severity: "high",
    category: "secret_leak",
    pattern: "\\b(Set-Cookie:|Cookie:)\\s*[^\\n]*(session|auth|token|jwt)[^\\n]*",
    rationale: "Output contains an authentication or session cookie.",
    remediation: "Redact output and invalidate the exposed session if needed."
  },
  {
    id: "output.basic-auth-url",
    appliesTo: ["output"],
    severity: "high",
    category: "secret_leak",
    pattern: "https?:\\/\\/[^\\s\\/]+:[^\\s\\/]+@",
    rationale: "Output contains credentials embedded in a URL.",
    remediation: "Redact output and rotate the embedded credential."
  },
  {
    id: "output.us-ssn",
    appliesTo: ["output"],
    severity: "medium",
    category: "pii_leak",
    pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b",
    rationale: "Output resembles a US Social Security number.",
    remediation: "Redact personal identifiers before sharing output."
  },
  {
    id: "output.kr-rrn",
    appliesTo: ["output"],
    severity: "high",
    category: "pii_leak",
    pattern: "\\b\\d{6}-[1-4]\\d{6}\\b",
    rationale: "Output resembles a Korean resident registration number.",
    remediation: "Redact personal identifiers before sharing output."
  },
  {
    id: "output.credit-card",
    appliesTo: ["output"],
    severity: "medium",
    category: "pii_leak",
    pattern: "\\b(?:\\d[ -]*?){13,19}\\b",
    rationale: "Output resembles a payment card number.",
    remediation: "Redact payment data and avoid storing raw card numbers."
  }
];
