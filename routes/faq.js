const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var faqs = [{
      slug: 'what-is-this',
      question: 'What is this site?',
      answer: `
        <p>SQUAWKoverflow is a simple collecting game where you can have an aviary of your favorite birds!  All you have to do is hatch eggs and decide if you want to keep the bird inside or release it for someone else to add to their own aviary.</p>

        <p>You can engage as much or as little as you like. We have a small community of members who like to gift and trade birds, and there are games on the Discord server you can play to gain friendship with your favorite bird ("Birdy Buddy"). If the social aspect isn't for you, that's fine! Collect all the birds you want and enjoy them however you prefer.</p>
      `
    },
    {
      slug: 'cost-to-play',
      question: 'Is it free to play?',
      answer: `
        <p>You can absolutely play SQUAWKoverflow for free. There are some limitations, which are:</p>
	<ul>
	  <li>You can hatch a new egg once every 10 minutes.</li>
	  <li>You can have up to 12,000 birds in your aviary.</li>
	</ul>
	<p>There is a Patreon where you can pick a support level that matches the playstyle you want.  For $3, you can hatch eggs as much as you want, as often as you want.  For $5, your aviary can contain as many birds as your heart desires. For $10, there are some <a href="#extra-insights">extra insights</a> that become available to you.</p>
	<p>It's completely optional to become a supporter, but it is deeply appreciated! You can support us at <a href="https://patreon.com/squawkoverflow" target="_blank">patreon.com/squawkoverflow</a>.</p>
      `
    },
    {
      slug: 'bug',
      question: 'I found an error or issue with the site, what do I do?',
      answer: `
		  <p>You can submit <a href="https://bugs.squawkoverflow.com${req.session.user ? '/?member=' + req.session.user : ''}">a bug report</a> to alert the developer and receive a bug for your troubles!</p>
		  `
    },
    {
      slug: 'weird-eggs',
      question: 'What\'s with the weird eggs?',
      answer: `
        <p>You'll likely discover some pretty weird eggs while deciding which to hatch. Much egg? Forked egg? <em>Human egg??</em></p>

        <p>The adjectives for the eggs come from the descriptions of birds on <a href="https://ebird.org">eBird.org</a>. Originally, the plan was to collect all the adjectives, then go through them and do some quality control to ensure the results made sense.</p>

        <p>But then we hatched the perpendicular eggs. We were delighted when we found fluffy, lovelorn, lethargic, and monstrous eggs.</p>

        <p>So we kept them all! Besides, what's the fun in making sense?</p>
      `
    },
    {
      slug: 'flock-management',
      question: 'How do I organize my aviary into flocks?',
      answer: `
        <p>The more birds you get, the more you may want to organize them! You can make as many flocks as you want, and birds can belong to more than one flock.</p>

        <p>When logged in, there is a link to <a href="/flocks" target="_blank">Flocks</a> that will take you to a page with a <a class="btn btn-light btn-sm">New Flock</a> button, which is how you create new flocks. How you want to name your flocks is completely up to you, and can even include emoji!</p>

        <p>Once you've created a flock (or several), the Manage Flocks page will now have them listed out as separate rows that can be click-and-dragged to reorder them however you like.</p>

        <p>Each one will have a <a class="btn btn-light btn-sm">✏️</a> button, which brings up a page to rename it, change the description, delete it, and—most of all!—add and remove birds from the flock.</p>
      `
    },
    {
      slug: 'tier-limits',
      question: 'Why are there limits and how can I remove them?',
      answer: `
		  <p>In order to offset hosting costs, <a href="https://patreon.com/squawkoverflow">we have a Patreon</a>, but we also have what we hope is a very reasonable free tier.  For free, you can hatch an egg every 10 minutes and have up to 12,000 birds in your aviary, which is enough for one of every species plus extra of your favorites!</p>

                  <p>Additionally, every tier will grant the title of that tier and the ones below it.  For example, a Bird Fanatic can choose to display the title Bird Collector on their profile while still enjoying the extra insights!</p>

                  <p>The subscription tiers available through our Patreon are:</p>

		  <div class="row text-center py-3">
		    <div class="col-sm-6 col-lg-3 pb-5">
		      <h5><strong>Bird Lover</strong></h5>

		      <h6 class="pb-3"><em>$3/mo</em></h6>

		      <p><small>No time limit on hatching eggs</small></p>
                      <p><small>Patron-only Discord channel</small></p>
		    </div>
                    <div class="col-sm-6 col-lg-3 pb-5">
                      <h5><strong>Bird Collector</strong></h5>

                      <h6 class="pb-3"><em>$5/mo</em></h6>

		      <p><small>No limit on aviary size</small></p>
                      <p><small>No time limit on hatching eggs</small></p>
                      <p><small>Patron-only Discord channel</small></p>
                    </div>
                    <div class="col-sm-6 col-lg-3 pb-5">
                      <h5><strong>Bird Fanatic</strong></h5>

                      <h6 class="pb-3"><em>$10/mo</em></h6>

		      <p><small>Extra insights</small></p>
		      <p><small>No limit on aviary size</small></p>
                      <p><small>No time limit on hatching eggs</small></p>
                      <p><small>Patron-only Discord channel</small></p>
                    </div>
                    <div class="col-sm-6 col-lg-3 pb-5">
                      <h5><strong>V.I.B</strong></h5>

                      <h6 class="pb-3"><em>$25/mo</em></h6>

		      <p><small>A special variant of your pet</small></p>
		      <p><small>Custom title of your choice</small></p>
		      <p><small>Extra insights</small></p>
		      <p><small>No limit on aviary size</small></p>
                      <p><small>No time limit on hatching eggs</small></p>
                      <p><small>Patron-only Discord channel</small></p>
                    </div>
		  </div>
		  `
    },
    {
      slug: 'extra-insights',
      question: 'What are the extra insights available to Bird Fanatics?',
      answer: `
            <p>Supporting our Patreon at the $10 level gives you extra insights... but what does that mean, exactly?</p>

	    <ul>
	      <li>When hatching eggs, you will see a #x/#y text below the egg. This indicates how many species can hatch from the egg (#y) and how many of them you have in your aviary (#x).</li>
	      <li>When viewing an aviary, you will have more filter options than normal. You can filter to show duplicates in an aviary, any birds that are on your wishlist, or birds you don't have yet when viewing someone else's aviary!</li>
	    </ul>

	    <p>This list may change as new ideas come to light. Feel free to suggest some of your own on the Discord server or send us an email at <a href="mailto:patreon@squawkoverflow.com">patreon@squawkoverflow.com</a>!</p>
	  `
    },
	  {
		  slug: 'contribute-art',
		  question: 'I have art I would like to contribute! How does that work?',
		  answer: `
                    <p>First of all, thank you!  SQUAWK is largely a volunteer effort, so all the help we can get is appreciated.</p>

		    <p>If you are the artist, there are some important things you may want to know:</p>
		    
		    <ol>
		      <li>Your art will not be used in any merchandising (because we don't have any) or advertisements (we also don't have any).</li>
		      <li>We have no plans to profit off your art.  In the event that there is any overages from the Patreon that exceed server and hosting costs, those will be funneled into more art.</li>
		      <li>You retain full rights and ownership of your work and may revoke permission for its usage on SQUAWK at any time, no questions asked.</li>
		    </ol>

		    <p>If you are NOT the artist and the work is not Public Domain or Creative Commons, it would be greatly appreciated if the link you include has information on how we could get in touch with the artist.  Otherwise, we won't use non-PD/non-CC art without permission.</p>
		  `
	  }
  ];

  res.render('faq/index', {
    title: 'Frequently Asked Questions',
    faqs: faqs
  });
});

module.exports = router;
