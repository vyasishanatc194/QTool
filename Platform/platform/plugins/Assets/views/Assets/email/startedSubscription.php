<p>
	Hey <?php echo Q_Html::text($user->displayName()) ?>, you've started your subscription
	to <?php echo Q_Html::text($plan->title) ?>
	with <?php echo Q_Html::text($publisher->displayName()) ?>
	at <?php echo Q_Html::text("$symbol$amount") ?> for <?php echo $months ?> months.
</p>

<p>
	See you on <?php echo Q_Html::a($link, Q_Html::text($communityName)) ?>!
</p>