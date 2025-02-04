## **Technical Specification (TS) “Tact Package Manager”**

### **1. General Information**

- **Project Name**: “Tact Package Manager” (TPM)
- **Purpose**: Simplify the integration of external libraries and modules written in the Tact smart-contract language into the developer’s workspace.

### **2. Project Objectives**

1. **Streamline the workflow** for Tact developers when using third-party libraries.
2. **Reduce time** spent on installing/updating/removing Tact modules.
3. **Improve standardization and project structure** in Tact by providing a unified dependency management system.
4. Develop a **transparent and scalable** tool for the future Tact community.

### **3. Background and Motivation**

- The Tact language is evolving rapidly but lacks a fully-fledged package manager.
- Developers currently must manually clone repositories and import files.
- We need an ecosystem that makes using third-party libraries easier (similar to npm or Yarn for JavaScript).
- There should be a straightforward way to map **short names** (e.g., `jetton`) to actual GitHub repositories, plus a method to track the **latest commit hash** for each installed package.

### **4. Key Stakeholders**

- **Tact Smart Contract Developers**: the tool’s end users.
- **Tact Architects**: define standards and specifications.
- **Supporting Developers and DevOps**: manage CI/CD pipelines, check updates, ensure compatibility.

### **5. User Stories**

1. **Install a module by short name**:
   - The user runs `tpm install jetton`, and TPM looks up a local JSON file such as:
     ```json
     {
       "jetton": "https://github.com/tact-lang/jetton"
     }
     ```
     Then it clones the repository into `node_modules/tact_modules/jetton`.
2. **Update modules**:
   - With `tpm update`, all installed package commit hashes are checked against the remote repository; if a new commit is available, TPM updates to the latest commit.
3. **Remove modules**:
   - `tpm remove <alias>` (e.g., `jetton`) clears the corresponding files and entries from `tact-packages.json` (or an equivalent config file).
4. **Track commit hashes**:
   - Each installed package’s **latest commit hash** is stored locally. On subsequent updates, TPM compares the stored hash against the remote to detect changes.
5. **Version (commit) handling**:
   - Ability to install a specific commit hash or tag (e.g., `tpm install jetton@<commitHash>`).
6. **TypeScript integration**:
   - Connect Tact code via paths described in `tsconfig.json`, for example, `@tact/jetton/sources/utils`.
7. **Lock file support** (future improvement):
   - Possibly store commit hashes in a lock file for deterministic builds.

### **6. Functional Requirements**

1. **Local JSON-based aliases**:
   - A file (e.g., `tact-aliases.json`) that maps short names (like `"jetton"`) to full GitHub URLs.
   - `tpm install <alias>` resolves the GitHub URL from this file.
2. **Repository cloning**:
   - Use `simple-git` or a similar library to clone from GitHub.
   - Copy only the necessary directories (e.g., `sources`) into `node_modules/tact_modules/<alias>`.
3. **Storing and comparing commit hashes**:
   - After cloning, TPM records the **latest commit hash** in a local file (e.g., `tact-packages.json`).
   - On `tpm update`, TPM fetches the current hash from the remote repo and compares it to the stored hash.
4. **Commands**:
   - `install <alias>`: Clones the repo, copies needed files, records the hash.
   - `update`: Checks for new commits in each installed repo.
   - `remove <alias>`: Removes the files and config references.
5. **Install specific commits/versions**:
   - `tpm install <alias>@<commitHash>` to pin a specific commit.
6. **Package structure validation**:
   - Validate that `sources` (or required configs) exist in the cloned repo.
7. **Future expansions**:
   - **Lock file** for fully deterministic installs.
   - **Cache** to avoid repeated cloning.

### **7. Non-Functional Requirements**

1. **Performance**:
   - Cloning and copying files should be efficient and minimal.
2. **Usability**:
   - Provide a user-friendly CLI interface, similar to npm or Yarn.
3. **Extensibility**:
   - Ensure architecture can include other sources like GitLab, Bitbucket, or self-hosted Git solutions.
4. **Reliability**:
   - Handle unreachable repositories gracefully and provide clear error messages.
5. **Security**:
   - Consider verifying the integrity of the cloned code via optional hash checks.

### **8. Technology Stack**

- **Language**: TypeScript
- **Environment**: Node.js (>=14)
- **CLI Library**: `commander.js` (or equivalent)
- **Git Library**: `simple-git`
- **File System**: `fs-extra`, `path`
- **Testing**: `jest` or `mocha`

### **9. Architecture**

- **CLI** (`tpm`):
  - Commands: `install`, `update`, `remove`.
  - Reads from a local alias file (`tact-aliases.json`) and a package state file (`tact-packages.json`).
- **Core Modules**:
  1. `git-clone`: handles Git repository operations (clone, fetch latest commit).
  2. `file-handler`: manages copying relevant files (`sources`, config files) into `node_modules/tact_modules`.
  3. `registry-handler`: updates `tact-packages.json` with references to package short name, commit hash, and paths.
- **Future Modules**:
  - Lock file handling.
  - Caching mechanism to avoid repeated clones.

### **10. Development Phases and Rough Timeline**

1. **Requirements & Alias File Prototype** (1 week):
   - Decide on the structure of `tact-aliases.json`.
   - Prototype `install` with alias resolution.
2. **Core CLI Implementation** (1–2 weeks):
   - Finish `install`, `update`, `remove` commands.
   - Store commit hashes in `tact-packages.json`.
3. **Integration with Tact Projects** (1 week):
   - Test real usage in a Tact project (e.g., `tact-lang/jetton`).
4. **Support for Specific Commits** (1 week):
   - `tpm install <alias>@<commitHash>`
   - Validate that the commit exists.
5. **Testing and Documentation** (1–2 weeks):
   - Automated tests (CI) + user guide.
6. **Release** (1 week):
   - Publish to npm, set up GitHub repo for issues and contributions.
7. **Future Enhancements** (ongoing):
   - Lock file support, caching, error reporting improvements.

### **11. Success Criteria (Acceptance Criteria)**

- **Local alias resolution**: `tpm install jetton` correctly fetches `https://github.com/tact-lang/jetton`.
- **Accurate commit hash storage**: The system reliably stores and checks the commit hash.
- **No critical errors**: e.g., empty folders, broken references.
- **Clear documentation**: README covers all commands and how to configure aliases.
- **Developer satisfaction**: Reduces the overhead of manual cloning and linking.

### **12. Main Risks**

1. **External repo availability**: Mitigated via caching or graceful fallbacks.
2. **Alias conflicts**: If two aliases map to the same path or multiple repos.
3. **Varying project structures**: Convention that repos must have a `sources` folder.
4. **Commit-based versioning complexity**: Must handle invalid or nonexistent commit hashes.

### **13. Support and Maintenance**

- **Issue Tracker** on GitHub for collecting feedback and bug reports.
- **Automated CI** for tests on each PR.
- **Semantic Versioning** (SEMVER): Start with 0.x.x for MVP, move to 1.0.0 upon maturity.
