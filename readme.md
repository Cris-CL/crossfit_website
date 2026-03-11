# Git / GitHub Workflow

This guide explains how we work on the website safely, how to make changes, and how to avoid breaking the live version.

The goal is simple:

- keep the live website safe
- allow experimentation without risk
- make it easy to go back if something goes wrong

---

# 1. Basic idea

We use **GitHub** to store the code and track changes.

We use **branches** so new work does not affect the live website until it is ready.

## The branches

- **main** = the safe/live version
- **feature/...** = for new work or experiments
- optional: **fix/...** = for bug fixes

## Important rule

**Do not work directly on main unless it is an emergency.**

All new edits should start in a new branch.

---

# 2. The normal workflow

1. Open the project in VS Code
2. Switch to main
3. Pull the latest changes from GitHub
4. Create a new branch
5. Make edits
6. Test the site locally
7. Commit the changes
8. Push the branch to GitHub
9. Open a Pull Request
10. Merge into main after checking it looks good
11. Deploy from main
12. Create a tag for that deployed version

---

# 3. Before starting any work

## Step 1: Open the project in VS Code

Open the folder for the website project.

## Step 2: Make sure you are on main

In VS Code:

- Look at the bottom-left corner
- You should see the current branch name
- If it is not **main**, click the branch name and switch to **main**

## Step 3: Pull the latest version

In VS Code:

- Open **Source Control**
- Click the `...` menu
- Choose **Pull**

Or in terminal:

    git checkout main
    git pull origin main

---

# 4. How to create a new branch

Create a new branch for every new task.

## When to create a branch

Create a branch when:

- changing text
- changing images
- updating layout/design
- adding a section
- fixing a bug
- trying an idea
- experimenting

## Branch name examples

- feature/change-homepage-text
- feature/new-pricing-section
- fix/contact-form
- content/update-about-page

## In VS Code

1. Click the branch name in the bottom-left corner
2. Choose **Create new branch**
3. Type a clear name
4. Press Enter

## Or in terminal

    git checkout main
    git pull origin main
    git checkout -b feature/change-homepage-text

---

# 5. How to make changes safely

1. Edit the files
2. Save your work
3. Run the website locally to check the result
4. Commit when a meaningful piece of work is done

---

# 6. How to test the site locally

After making changes, always check that the website still works before committing or pushing.

Since the project uses **Firebase**, we run the Firebase emulator locally.

## Start the local Firebase server

Run the following command in the project folder:

    firebase emulators:start --project crossfitwebsite

This starts the local Firebase environment.

Once it starts, the terminal will show the local addresses where the site can be accessed.

Usually something like:

    http://127.0.0.1:5000
    http://localhost:5000

Open the address in your browser and check that:

- the page loads correctly
- layout and styles look correct
- links and buttons work
- images load properly
- no errors appear in the console

## Stop the emulator

To stop the emulator, press:

    Ctrl + C

# 7. How to commit changes

A **commit** is a save point.

Commit after finishing a small useful change.

## In VS Code

1. Open **Source Control**
2. You will see the changed files
3. Write a short message describing the change
4. Click **Commit**

Example commit messages:

- Update hero section text
- Add pricing cards
- Fix mobile navigation
- Replace trainer images

## Terminal version

    git add .
    git commit -m "Update hero section text"

---

# 8. How to push changes to GitHub

After committing, upload the branch to GitHub.

## In VS Code

Click **Push** or **Sync Changes**.

## In terminal

    git push origin feature/change-homepage-text

First push for a branch:

    git push -u origin feature/change-homepage-text

---

# 9. How to open a Pull Request

A Pull Request asks to merge your changes into main.

Steps:

1. Open the repository on GitHub
2. Click **Compare & pull request**
3. Confirm:
   - base branch = main
   - compare branch = your branch
4. Add a title
5. Add a short description
6. Click **Create pull request**

Example title:

Update homepage hero text

Example description:

Updated the hero section title and subtitle.
Tested locally and layout looks correct.

---

# 10. How to merge changes into main

1. Open the Pull Request
2. Review the changes
3. Click **Merge pull request**
4. Confirm the merge

Then update your local copy.

    git checkout main
    git pull origin main

---

# 11. Delete the branch after merging

After merging, the branch is usually no longer needed.

On GitHub:

Click **Delete branch**.

Locally:

    git branch -d feature/change-homepage-text

---

# 12. When to use branches

Always create a branch for:

- experiments
- new features
- design changes
- content updates
- bug fixes
- layout changes

Rule of thumb:

**If the change is not already live, do it in a branch.**

---

# 13. When to make tags

Tags mark important stable versions.

Usually tags represent versions that were deployed to production.

Examples:

v1.0.0
v1.0.1
v1.1.0

Version meaning:

- major → big change
- minor → new feature
- patch → small fix

---

# 14. How to create a tag

First update main.

    git checkout main
    git pull origin main

Create the tag:

    git tag v1.0.0

Push the tag:

    git push origin v1.0.0

Recommended annotated tag:

    git tag -a v1.0.0 -m "First production release"
    git push origin v1.0.0

---

# 15. How to deploy to Firebase

Deploy only from main.

    git checkout main
    git pull origin main
    firebase deploy

If only hosting:

    firebase deploy --only hosting

---

# 16. Recommended deployment workflow

1. Create branch
2. Make changes
3. Test locally
4. Commit changes
5. Push branch
6. Open Pull Request
7. Merge into main
8. Pull updated main
9. Deploy to Firebase
10. Tag the deployed version

---

# 17. How to go back to a previous version

You can restore an earlier version using tags.

Example:

    git checkout v1.0.1

To create a branch from that version:

    git checkout -b restore-v1.0.1 v1.0.1

---

# 18. Emergency rollback

If production breaks:

    git checkout -b restore-v1.0.1 v1.0.1
    firebase deploy

Then fix the problem in a separate branch.

---

# 19. Rules to avoid problems

Always:

- pull before starting work
- create a branch for changes
- commit often
- use clear commit messages
- test locally
- deploy only from main
- tag production releases

Avoid:

- working directly on main
- deploying from random branches
- committing huge unrelated changes
- skipping testing

---

# 20. Daily quick guide

Start working:

    git checkout main
    git pull origin main
    git checkout -b feature/my-change

Save progress:

    git add .
    git commit -m "Describe the change"
    git push -u origin feature/my-change

Deploy:

    git checkout main
    git pull origin main
    firebase deploy

Tag release:

    git tag -a v1.0.0 -m "Production release"
    git push origin v1.0.0

---

# 21. Suggested branch naming

Use these patterns:

- feature/...
- fix/...
- content/...

Examples:

feature/new-classes-section
fix/footer-link
content/update-coach-bios

---

# 22. Suggested commit messages

Good examples:

Add pricing section
Update gym schedule text
Fix broken contact link
Replace gallery images

Guidelines:

- start with a verb
- keep it short
- describe the change clearly

---

# 23. Recommended GitHub protection

Enable **branch protection** for main.

Recommended settings:

- require Pull Requests before merging
- block direct pushes to main

This prevents accidental changes to the live version.

---

# 24. Testing recommendation

If possible, use **Firebase Hosting Preview Channels**.

This allows testing changes with a preview link before publishing to the real site.

---

# 25. Glossary

Branch = workspace for changes
Commit = save point
Push = upload changes to GitHub
Pull = download changes from GitHub
Pull Request = request to merge code
Tag = version label
Deploy = publish the website

---

# 26. Final rule

When in doubt:

- create a branch
- test locally
- commit changes
- push to GitHub
- merge after review
- deploy from main
- tag live deployments
