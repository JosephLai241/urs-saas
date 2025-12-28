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

![Landing page configuration warning banner](<>)

Click on the "Configure Credentials" button and follow the instructions listed in the Reddit API Credentials box to get your Reddit credentials, then submit the client ID, client secret, and Reddit username (optional). Your account is now ready to scrape Reddit.

## Creating a New Project

First, create a new project by clicking on the "Create Project" or "New Project" button in the dashboard. Enter a name for the project, then click "Create". A new card element should populate your dashboard displaying the project name, description, number of jobs, creation date, and open/delete project buttons.

![Create new project](<>)

## Kicking Off a Scrape

Click on the "Open" button on the project you just created, then click on "New Scrape" to view scrape options and settings.

![Open project](<>)

For Subreddit scrapes, enter the name of the Subreddit and select the category as well as the number of results to return from the scrape. You can also optionally select a time filter when scraping the "Top" or "Controversial" categories.

For Redditor scrapes, enter the name of the Redditor and the total number of results to return per category.

For submission comments scrapes, paste the URL to the submission as well as the total number of comments to return. Passing `0` for number of results to return will scrape all comments from the submission.

## Waiting for Scrapes to Finish

Once a scrape job is submitted, a progress bar is displayed indicating the current scrape progress. Once the scrape completes, the results are shown in the page along with share and export options.

> [!NOTE]
> The submission comments scraper tends to take the longest since URS needs to create a structured comment tree. Scrape speeds are also dependent on how many comments are being scraped from a particular submission.

## Viewing Scrape Results

Subreddit scrapes will give you a list of results up to the limit you've provided on the scrape configuration page.

![Subreddit scrape results](<>)

Redditor scrapes will display the Redditor's link karma, comment karma, the total number of items scraped, as well as lists of recent submissions and comments.

![Redditor scrape results](<>)

Submission comments scrapes will display a collapsible comment tree containing the scraped comments from the submission.

![Comments scrape results](<>)

## Sharing Scrape Results

You can generate a share link by clicking on the "Share" button near the top right corner on the scrape results page. This link provides a read-only version of the scrape data.

![Share scrape page](<>)
