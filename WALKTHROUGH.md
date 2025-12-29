# Walkthrough

## Table of Contents

- [Signup](#signup)
- [Configure Reddit Credentials](#configure-reddit-credentials)
- [Creating a New Project](#creating-a-new-project)
- [Kicking Off a Scrape](#kicking-off-a-scrape)
- [Waiting for Scrapes to Finish](#waiting-for-scrapes-to-finish)
- [Viewing Scrape Results](#viewing-scrape-results)
- [Sharing Scrape Results](#sharing-scrape-results)

## Signup

Visit the [login page](https://urs-saas.vercel.app/login) and sign up for a new account. You should receive a confirmation email from Supabase Auth. Once the confirmation email is clicked, you should be able to log in with your credentials.

## Configure Reddit Credentials

Once you've logged in, you should see this banner at the top of the page:

<img width="1512" height="446" alt="Screenshot 2025-12-28 at 16 02 11" src="https://github.com/user-attachments/assets/c779a97b-bd31-4302-b39a-abe575f67d48" />

Click on the "Configure Credentials" button and follow the instructions listed in the Reddit API Credentials box to get your Reddit credentials, then submit the client ID, client secret, and Reddit username (optional). Alternatively, you can follow the [instructions listed in the URS Manual here](https://josephlai241.github.io/URS/credentials.html) to get your credentials.

<img width="682" height="664" alt="Screenshot 2025-12-28 at 17 10 22" src="https://github.com/user-attachments/assets/208e718b-5bb0-4647-928f-99677dd2a7c8" />

Your account is now ready to scrape Reddit.

## Creating a New Project

First, create a new project by clicking on the "Create Project" or "New Project" button in the dashboard. Enter a name for the project, then click "Create". A new card element should populate your dashboard displaying the project name, description, number of jobs, creation date, and open/delete project buttons.

<img width="1510" height="498" alt="Screenshot 2025-12-28 at 16 06 04" src="https://github.com/user-attachments/assets/c469b4d2-a9fa-46c4-a70f-2e27b69d48e6" />
<img width="628" height="446" alt="Screenshot 2025-12-28 at 16 07 33" src="https://github.com/user-attachments/assets/2215bea6-d167-4a0a-bd19-0e128236e601" />

## Kicking Off a Scrape

Click on the "Open" button on the project you just created, then click on "New Scrape" to view scrape options and settings.

<img width="1509" height="662" alt="Screenshot 2025-12-28 at 16 08 47" src="https://github.com/user-attachments/assets/5ba34ca4-4f34-4ca7-8eb6-b454d68161cb" />

For Subreddit scrapes, enter the name of the Subreddit and select the category as well as the number of results to return from the scrape. You can also optionally select a time filter when scraping the "Top" or "Controversial" categories.

For Redditor scrapes, enter the name of the Redditor and the total number of results to return per category.

For submission comments scrapes, paste the URL to the submission as well as the total number of comments to return. Passing `0` for number of results to return will scrape all comments from the submission.

## Waiting for Scrapes to Finish

Once a scrape job is submitted, a progress bar is displayed indicating the current scrape progress. Once the scrape completes, the results are shown in the page along with share and export options.

> [!NOTE]
> The submission comments scraper tends to take the longest since URS needs to create a structured comment tree. Scrape speeds are also dependent on how many comments are being scraped from a particular submission.
> <img width="1509" height="547" alt="Screenshot 2025-12-28 at 16 26 31" src="https://github.com/user-attachments/assets/ae2cba04-e3ae-42a3-bdd3-d719a6fa27d1" />

## Viewing Scrape Results

Subreddit scrapes will give you a list of results up to the limit you've provided on the scrape configuration page.

<img width="1509" height="831" alt="Screenshot 2025-12-28 at 16 14 35" src="https://github.com/user-attachments/assets/7c3abdac-c2a3-4d46-9f51-e8f3dc0a89f4" />

Redditor scrapes will display the Redditor's link karma, comment karma, the total number of items scraped, as well as lists of recent submissions and comments.

<img width="1512" height="830" alt="Screenshot 2025-12-28 at 16 51 19" src="https://github.com/user-attachments/assets/217955ca-ca5e-4629-b9d7-9085123521ea" />

Submission comments scrapes will display a collapsible comment tree containing the scraped comments from the submission.

<img width="1512" height="833" alt="Screenshot 2025-12-28 at 16 53 44" src="https://github.com/user-attachments/assets/bf920adf-0265-400e-98a8-348fae0f5424" />

## Sharing Scrape Results

You can generate a share link by clicking on the "Share" button near the top right corner on the scrape results page.

<img width="1511" height="250" alt="Screenshot 2025-12-28 at 16 54 58" src="https://github.com/user-attachments/assets/5747b8b2-89e9-4b7c-a454-36a5f1a35fc1" />

This link provides a read-only version of the scrape data.

<img width="1511" height="833" alt="Screenshot 2025-12-28 at 16 55 26" src="https://github.com/user-attachments/assets/7d621d2d-4c6b-4f21-a9d9-907892471385" />
