export const mlModelEras = [
  {
    id: 'foundations-geometry',
    label: 'Foundations of Fitting and Geometry',
    years: '1805–1959',
    narrative:
      'Machine learning originated in classical mathematics: minimizing squared residuals, identifying orthogonal variance axes, separating normal distributions, and iteratively adjusting decision hyperplanes.',
  },
  {
    id: 'statistical-expansion',
    label: 'Probabilistic and Regularized Models',
    years: '1961–1989',
    narrative:
      'As datasets grew in dimension and noise, algorithms turned to conditional independence, continuous shrinkage penalties, iterative latent variable estimation, and greedy recursive feature splits.',
  },
  {
    id: 'margins-sparsity-ensembles',
    label: 'Margins, Sparsity and Ensembles',
    years: '1995–2004',
    narrative:
      'The 1990s introduced dual optimization with kernel mappings, exact L1 parameter zeroing, non-parametric spatial density clustering, and variance reduction through tree ensembles.',
  },
  {
    id: 'modern-guarantees-scale',
    label: 'Manifolds, Guarantees and Scaled Clusters',
    years: '2005–2026',
    narrative:
      'Modern classical methods deliver rigorous finite-sample coverage guarantees, preserve non-linear local manifolds, isolate anomalies with random partitioning, and stream mini-batch updates via exponential moving averages.',
  },
] as const;

export type MlModelEraId = (typeof mlModelEras)[number]['id'];

export const mlModelCategories = [
  'regression',
  'classification',
  'clustering',
  'trees-ensembles',
  'dimensionality-reduction',
  'uncertainty-anomaly',
] as const;

export type MlModelCategory = (typeof mlModelCategories)[number];

export interface MlModelMath {
  objective: string;
  updateOrClosedForm: string;
  workedExample: string;
}

export interface MlModelAtlasEntry {
  id: string;
  name: string;
  year: number;
  era: MlModelEraId;
  category: MlModelCategory;
  diagram: string;
  reusedVisual: boolean;
  cameBefore: string;
  ledTo: string;
  problem: string;
  previousLimit: string;
  maths: MlModelMath;
  evaluationMetrics: string;
  applications: string[];
  source: {
    label: string;
    url: string;
    year: number;
  };
  learnPath: string;
}

export const mlModelsAtlas: MlModelAtlasEntry[] = [
  {
    id: 'linear-regression',
    name: 'Linear Regression (Least Squares)',
    year: 1805,
    era: 'foundations-geometry',
    category: 'regression',
    diagram: 'linear-regression',
    reusedVisual: true,
    cameBefore: 'Hand-calculated averages and qualitative geometric sketching',
    ledTo: 'Ridge regression, logistic regression, and generalized linear models',
    problem:
      'Linear regression finds the linear relationship between continuous input features and a numeric target by minimizing the sum of squared discrepancies between observations and predictions.',
    previousLimit:
      'Astronomers and surveyors previously averaged arbitrary subsets of measurements or solved systems of equations by discarding contradictory observations, with no systematic principle for resolving overdetermined equations.',
    maths: {
      objective: '\\min_{w} \\sum_{i=1}^n \\left(y_i - x_i^T w\\right)^2 = \\|y - X w\\|_2^2',
      updateOrClosedForm: 'w^* = (X^T X)^{-1} X^T y',
      workedExample:
        'Given points (1, 2), (2, 3), and (3, 5): means are \\bar{x} = 2.0, \\bar{y} = 3.333. Slope w_1 = \\frac{(-1)(-1.333) + 0 + (1)(1.667)}{(-1)^2 + 0^2 + 1^2} = \\frac{3.0}{2.0} = 1.5. Intercept w_0 = 3.333 - 1.5(2.0) = 0.333. For input x=4, \\hat{y} = 1.5(4) + 0.333 = 6.333.',
    },
    evaluationMetrics:
      'Mean Squared Error (MSE) and Root Mean Squared Error (RMSE) measure average prediction error in output units. R² (coefficient of determination) indicates the fraction of target variance explained by the model relative to a mean baseline.',
    applications: [
      'Forecasting energy demand from ambient temperature and production schedules',
      'Estimating real estate valuations from square footage and location variables',
      'Quantifying dose-response relationships in pharmacology trials',
    ],
    source: {
      label: 'Legendre (1805), Nouvelles méthodes pour la détermination des orbites des comètes',
      url: 'https://gallica.bnf.fr/ark:/12148/bpt6k97262d',
      year: 1805,
    },
    learnPath: '/docs/machine-learning/linear-regression',
  },
  {
    id: 'pca-svd',
    name: 'PCA / SVD',
    year: 1901,
    era: 'foundations-geometry',
    category: 'dimensionality-reduction',
    diagram: 'pca-svd',
    reusedVisual: true,
    cameBefore: 'Linear regression fitting one target against selected raw features',
    ledTo: 'Kernel PCA, factor analysis, latent semantic analysis, and t-SNE',
    problem:
      'Principal Component Analysis projects high-dimensional observations onto an orthogonal lower-dimensional subspace that preserves maximum variance without requiring target labels.',
    previousLimit:
      'Ordinary regression treats one variable as the dependent target and minimizes vertical distances. Pearson noticed data often has no designated output variable and requires minimizing perpendicular Euclidean distances to an optimal line or plane.',
    maths: {
      objective: '\\max_{v} v^T \\Sigma v \\quad \\text{subject to} \\quad \\|v\\|_2 = 1',
      updateOrClosedForm: '\\Sigma v_j = \\lambda_j v_j \\quad \\text{or} \\quad X = U \\Sigma V^T',
      workedExample:
        'Centered data X = \\begin{bmatrix} 2 & 1 \\\\ -2 & -1 \\end{bmatrix}. Covariance \\Sigma = \\frac{1}{2} X^T X = \\begin{bmatrix} 4 & 2 \\\\ 2 & 1 \\end{bmatrix}. Characteristic equation \\lambda^2 - 5\\lambda = 0 gives eigenvalues \\lambda_1 = 5, \\lambda_2 = 0. First eigenvector v_1 = \\frac{1}{\\sqrt{5}}[2, 1]^T \\approx [0.894, 0.447]^T. Projecting [2, 1] yields 1D coordinate z = 2(0.894) + 1(0.447) = 2.236.',
    },
    evaluationMetrics:
      'Explained variance ratio per principal component tracks retained information. Reconstruction error (Frobenius norm between original and projected-back matrices) measures information lost during projection.',
    applications: [
      'Compressing multispectral satellite bands into primary terrain features',
      'Visualizing high-dimensional genomic expression profiles on 2D plots',
      'Decorrelating inputs before feeding into non-regularized estimators',
    ],
    source: {
      label: 'Pearson (1901), On lines and planes of closest fit to systems of points in space',
      url: 'https://doi.org/10.1080/14786440109462720',
      year: 1901,
    },
    learnPath: '/docs/machine-learning/pca-svd',
  },
  {
    id: 'lda-qda',
    name: 'LDA / QDA',
    year: 1936,
    era: 'foundations-geometry',
    category: 'classification',
    diagram: 'lda-qda',
    reusedVisual: true,
    cameBefore: 'Heuristic distance comparisons without pooling covariance structure',
    ledTo: 'Multivariate analysis of variance and modern linear classifiers',
    problem:
      'Linear and Quadratic Discriminant Analysis find linear or quadratic boundaries that maximize between-class variance relative to within-class variance under Gaussian class assumptions.',
    previousLimit:
      'PCA finds directions of maximum total variance, which often conflates differences between classes with high variance within irrelevant background features.',
    maths: {
      objective: '\\max_{w} \\frac{w^T S_B w}{w^T S_W w} \\quad \\text{where } S_B = (\\mu_1 - \\mu_0)(\\mu_1 - \\mu_0)^T',
      updateOrClosedForm: 'w = \\Sigma^{-1}(\\mu_1 - \\mu_0) \\quad \\text{for LDA}',
      workedExample:
        'In 1D, class 0 has mean \\mu_0 = 1.0, class 1 has mean \\mu_1 = 4.0, with shared variance \\sigma^2 = 1.0 and equal priors \\pi_0 = \\pi_1 = 0.5. Decision threshold sits at x^* = \\frac{\\mu_0 + \\mu_1}{2} = \\frac{1.0 + 4.0}{2} = 2.5. For observation x = 3.0, discriminant score \\delta_1(3.0) = 3(4) - 8 = 4.0 > \\delta_0(3.0) = 3(1) - 0.5 = 2.5, classifying x into class 1.',
    },
    evaluationMetrics:
      'Classification accuracy, macro-averaged F1 score, and confusion matrices. Discriminant ratio evaluates separation between projected class centroids.',
    applications: [
      'Taxonomic specimen classification based on anatomical measurements',
      'Credit scoring to classify loan default risk using financial ratios',
      'Face recognition feature extraction via Fisherfaces projection',
    ],
    source: {
      label: 'Fisher (1936), The use of multiple measurements in taxonomic problems',
      url: 'https://doi.org/10.1111/j.1469-1809.1936.tb02137.x',
      year: 1936,
    },
    learnPath: '/docs/machine-learning/naive-bayes-lda-qda',
  },
  {
    id: 'knn',
    name: 'k-Nearest Neighbours (k-NN)',
    year: 1951,
    era: 'foundations-geometry',
    category: 'classification',
    diagram: 'knn',
    reusedVisual: false,
    cameBefore: 'Parametric Gaussian assumptions required by Fisher linear discriminant analysis',
    ledTo: 'Cover-Hart consistency bounds, kd-trees, and modern approximate vector search',
    problem:
      'k-Nearest Neighbours predicts the target of a query point directly from the plurality vote or average of the k closest training examples in feature space, without an explicit parameter training phase.',
    previousLimit:
      'Parametric classifiers fail when data distributions are multimodal, non-linear, or impossible to fit with single Gaussian probability distributions.',
    maths: {
      objective: '\\hat{y}(x) = \\arg\\max_{c} \\sum_{i \\in N_k(x)} \\mathbb{I}(y_i = c)',
      updateOrClosedForm: 'd(x, x_i) = \\sqrt{\\sum_{j=1}^d (x_j - x_{i,j})^2}',
      workedExample:
        'Points: A(1, 1, y=0), B(2, 2, y=0), C(5, 5, y=1), D(6, 4, y=1). Query q(2, 3). Distances: d(q, B) = \\sqrt{0^2 + 1^2} = 1.0, d(q, A) = \\sqrt{1^2 + 2^2} = 2.236, d(q, C) = \\sqrt{3^2 + 2^2} = 3.606, d(q, D) = 4.123. For k=3, neighbors are B(0), A(0), C(1). Plurality vote gives 2 votes for class 0 versus 1 for class 1, predicting \\hat{y}=0.',
    },
    evaluationMetrics:
      'Accuracy, precision, recall, and multi-class log-loss. Latency profile (p95 query response time) is critical because all compute occurs during inference.',
    applications: [
      'Content-based recommendation matching user vectors to catalog items',
      'Optical character recognition on normalized binary pixel grids',
      'Imputing missing values in tabular surveys from demographic neighbors',
    ],
    source: {
      label: 'Fix and Hodges (1951), Discriminatory Analysis: Nonparametric Discrimination',
      url: 'https://doi.org/10.2307/1403797',
      year: 1951,
    },
    learnPath: '/docs/machine-learning/k-nearest-neighbors',
  },
  {
    id: 'perceptron',
    name: 'Perceptron',
    year: 1957,
    era: 'foundations-geometry',
    category: 'classification',
    diagram: 'perceptron',
    reusedVisual: false,
    cameBefore: 'Static batch matrix inversions without streaming online mistake correction',
    ledTo: 'Multi-layer perceptrons, backpropagation, and support vector machines',
    problem:
      'The Perceptron learns an online separating hyperplane for linearly separable binary classes by stepping weights only when an incoming example is misclassified.',
    previousLimit:
      'Closed-form normal equations require storing all observations in memory and computing expensive matrix inversions that cannot update incrementally as new samples arrive.',
    maths: {
      objective: '\\min_{w, b} -\\sum_{i \\in \\mathcal{M}} y_i \\left(w^T x_i + b\\right) \\quad (y_i \\in \\{-1, +1\\})',
      updateOrClosedForm: '\\text{If } y_i(w^T x_i + b) \\le 0: \\quad w \\leftarrow w + \\eta y_i x_i, \\quad b \\leftarrow b + \\eta y_i',
      workedExample:
        'Current weight w = [0, 0]^T, b = 0, step \\eta = 1.0. Point x = [2, 1]^T, label y = +1. Prediction is \\mathrm{sign}(0^T x + 0) = -1 (mistake). Update: w \\leftarrow [0, 0]^T + 1.0(+1)[2, 1]^T = [2, 1]^T; b \\leftarrow 0 + 1.0(+1) = 1.0. Next score on x: [2, 1][2, 1]^T + 1 = 4 + 1 + 1 = 6 > 0, producing correct output +1.',
    },
    evaluationMetrics:
      'Mistake count on training passes (bounded by Novikoff theorem (R/\\gamma)² when linearly separable) and binary classification accuracy.',
    applications: [
      'Hardware-based binary pattern recognition in early optical scanners',
      'Linear threshold gating for streaming spam detection filters',
      'Building block for feedforward artificial neural network layers',
    ],
    source: {
      label: 'Rosenblatt (1958), The perceptron: A probabilistic model for information storage',
      url: 'https://doi.org/10.1037/h0042519',
      year: 1958,
    },
    learnPath: '/docs/machine-learning/sgd-classifier-regressor',
  },
  {
    id: 'kmeans',
    name: 'k-Means (Lloyd)',
    year: 1957,
    era: 'foundations-geometry',
    category: 'clustering',
    diagram: 'kmeans',
    reusedVisual: false,
    cameBefore: 'Manual heuristic binning of continuous signals without objective minimization',
    ledTo: 'k-means++, mini-batch k-means, vector quantization, and e-means',
    problem:
      'k-Means partitions n unlabeled observations into k Voronoi clusters by alternating between assigning points to the nearest centroid and recomputing centroids as cluster means.',
    previousLimit:
      'PCM signal digitizers needed to quantize continuous amplitudes into discrete bins without introducing excessive squared reconstruction distortion, but had no algorithmic procedure to optimize bin locations.',
    maths: {
      objective: '\\min_{\\{c_j\\}} \\sum_{i=1}^n \\min_{j \\in \\{1,\\dots,k\\}} \\|x_i - c_j\\|_2^2',
      updateOrClosedForm: 'c_j^{(t+1)} = \\frac{1}{|C_j^{(t)}|} \\sum_{i \\in C_j^{(t)}} x_i',
      workedExample:
        'Points x = [1, 2, 7, 8]. Initial centroids c_1 = 2.0, c_2 = 5.0. Assignments: |1-2|=1 < |1-5|=4 \\implies x_1 \\in C_1; |2-2|=0 \\implies x_2 \\in C_1; |7-2|=5 > |7-5|=2 \\implies x_3 \\in C_2; |8-2|=6 > |8-5|=3 \\implies x_4 \\in C_2. New centroids: c_1 = (1+2)/2 = 1.5; c_2 = (7+8)/2 = 7.5. Inertia decreases from 14.0 to 1.0.',
    },
    evaluationMetrics:
      'Inertia (Within-Cluster Sum of Squares, WCSS), Silhouette Coefficient (measuring cluster tightness versus separation, from -1 to +1), and Davies-Bouldin index.',
    applications: [
      'Vector quantization codebooks for speech and image compression codecs',
      'Customer market segmentation from transaction and engagement vectors',
      'Color quantization to reduce RGB palettes in computer graphics',
    ],
    source: {
      label: 'Lloyd (1982), Least squares quantization in PCM (Bell Labs tech memo 1957)',
      url: 'https://doi.org/10.1109/TIT.1982.1056489',
      year: 1957,
    },
    learnPath: '/docs/machine-learning/kmeans-hierarchical-clustering',
  },
  {
    id: 'hierarchical-clustering',
    name: 'Hierarchical Clustering',
    year: 1957,
    era: 'foundations-geometry',
    category: 'clustering',
    diagram: 'hierarchical-clustering',
    reusedVisual: false,
    cameBefore: 'Fixed-k flat clustering that requires pre-specifying cluster counts',
    ledTo: 'Ward minimum variance method, dendrogram cuts, and HDBSCAN',
    problem:
      'Hierarchical clustering constructs a nested tree of partitions (dendrogram) by iteratively merging the closest pair of clusters without requiring a fixed number of clusters upfront.',
    previousLimit:
      'Flat methods like k-means force the practitioner to guess k in advance and discard hierarchical relationships between sub-lineages and broad families.',
    maths: {
      objective: '\\min_{A, B} d(A, B) \\quad \\text{(agglomerative linkage)}',
      updateOrClosedForm: 'd_{\\text{Ward}}(A, B) = \\frac{|A||B|}{|A| + |B|} \\|\\mu_A - \\mu_B\\|_2^2',
      workedExample:
        'Three 1D clusters: A={1}, B={3}, C={8}. Pairwise distances: d(A, B)=2, d(B, C)=5, d(A, C)=7. Minimum distance is 2.0 between A and B: merge into D={1, 3} at height 2.0. Single linkage distance from D to C is \\min(|1-8|, |3-8|) = 5.0. Final merge connects D and C at height 5.0, completing the dendrogram.',
    },
    evaluationMetrics:
      'Cophenetic correlation coefficient (correlation between original pairwise distances and dendrogram cophenetic distances) and silhouette score across horizontal cuts.',
    applications: [
      'Phylogenetic tree reconstruction in computational evolutionary biology',
      'Taxonomic topic clustering of legal and medical document corpora',
      'Hierarchical grouping of financial assets for risk-parity portfolio weighting',
    ],
    source: {
      label: 'Sneath (1957), The application of computers to taxonomy',
      url: 'https://doi.org/10.1099/00221287-17-1-201',
      year: 1957,
    },
    learnPath: '/docs/machine-learning/kmeans-hierarchical-clustering',
  },
  {
    id: 'logistic-regression',
    name: 'Logistic Regression',
    year: 1958,
    era: 'foundations-geometry',
    category: 'classification',
    diagram: 'logistic-regression',
    reusedVisual: false,
    cameBefore: 'Linear probability models predicting values outside the [0, 1] probability range',
    ledTo: 'Multinomial logit, generalized linear models, and cross-entropy loss functions',
    problem:
      'Logistic regression models the probability of a categorical outcome by passing a linear combination of features through a sigmoid link function and optimizing log-likelihood.',
    previousLimit:
      'Ordinary least squares on binary targets produces outputs less than 0 or greater than 1, assumes constant error variance, and suffers severe distortion from distant points.',
    maths: {
      objective: '\\min_{w, b} -\\frac{1}{n} \\sum_{i=1}^n \\left[ y_i \\ln \\hat{p}_i + (1 - y_i) \\ln(1 - \\hat{p}_i) \\right]',
      updateOrClosedForm: '\\hat{p}_i = \\sigma(w^T x_i + b) = \\frac{1}{1 + e^{-(w^T x_i + b)}}, \\quad \\nabla_w L = \\frac{1}{n} X^T (\\hat{p} - y)',
      workedExample:
        'Feature x = 2.0, weight w = 1.5, bias b = -2.0, true label y = 1. Logit z = 1.5(2.0) - 2.0 = 1.0. Probability \\hat{p} = \\frac{1}{1 + e^{-1.0}} = \\frac{1}{1 + 0.3679} = 0.731. Log loss L = -\\ln(0.731) = 0.313. Error residual is (\\hat{p} - y) = 0.731 - 1 = -0.269, yielding gradient \\nabla_w = (-0.269)(2.0) = -0.538.',
    },
    evaluationMetrics:
      'Log-loss (cross-entropy), Area Under the ROC Curve (ROC-AUC), Brier score for probability calibration, and precision-recall trade-offs at specific decision thresholds.',
    applications: [
      'Predicting patient disease risk based on clinical test indicators',
      'Estimating ad click-through probabilities (CTR) in real-time auction engines',
      'Churn prediction in subscription software services',
    ],
    source: {
      label: 'Cox (1958), The regression analysis of binary sequences',
      url: 'https://doi.org/10.1111/j.2517-6161.1958.tb00292.x',
      year: 1958,
    },
    learnPath: '/docs/machine-learning/logistic-regression',
  },
  {
    id: 'naive-bayes',
    name: 'Naive Bayes',
    year: 1961,
    era: 'statistical-expansion',
    category: 'classification',
    diagram: 'naive-bayes',
    reusedVisual: true,
    cameBefore: 'Full covariance joint modeling requiring quadratic parameters in feature dimension',
    ledTo: 'Bayesian networks, spam filtering systems, and modern text classifiers',
    problem:
      'Naive Bayes computes class posterior probabilities using Bayes theorem under the simplifying assumption that all input features are conditionally independent given the class label.',
    previousLimit:
      'Joint probability estimation requires estimating 2^d parameters for d binary features, which rapidly overfits and becomes computationally intractable for realistic vocabularies.',
    maths: {
      objective: '\\hat{y} = \\arg\\max_c P(Y=c) \\prod_{j=1}^d P(X_j = x_j \\mid Y=c)',
      updateOrClosedForm: 'P(X_j = v \\mid Y=c) = \\frac{N_{c,j,v} + \\alpha}{N_c + \\alpha K} \\quad (\\text{Laplace smoothing})',
      workedExample:
        'Priors: P(spam)=0.4, P(ham)=0.6. Features: x_1 (free=1), x_2 (meeting=0). Likelihoods: P(free=1|spam)=0.8, P(meeting=0|spam)=0.9; P(free=1|ham)=0.1, P(meeting=0|ham)=0.5. Joint: P(x, spam) = 0.4(0.8)(0.9) = 0.288; P(x, ham) = 0.6(0.1)(0.5) = 0.030. Normalized posterior P(spam|x) = \\frac{0.288}{0.288 + 0.030} = 0.906 (90.6%).',
    },
    evaluationMetrics:
      'Multi-class log loss, balanced accuracy, and calibration curves. Brier score checks whether predicted probabilities match true event frequencies.',
    applications: [
      'Email spam classification based on bag-of-words token frequencies',
      'Sentiment analysis of customer reviews into positive and negative polarities',
      'Medical triage prioritization from binary symptom checklists',
    ],
    source: {
      label: 'Maron (1961), Automatic Indexing: An Experimental Inquiry',
      url: 'https://doi.org/10.1145/321075.321084',
      year: 1961,
    },
    learnPath: '/docs/machine-learning/naive-bayes-lda-qda',
  },
  {
    id: 'ridge',
    name: 'Ridge Regression (L2)',
    year: 1970,
    era: 'statistical-expansion',
    category: 'regression',
    diagram: 'ridge',
    reusedVisual: false,
    cameBefore: 'Unregularized least squares collapsing under collinear feature matrices',
    ledTo: 'Tikhonov regularization in inverse problems, weight decay in neural networks, and elastic net',
    problem:
      'Ridge regression shrinks linear regression coefficients toward zero by adding an L2 penalty on weight magnitude to the squared error objective, preventing variance explosion under collinearity.',
    previousLimit:
      'When features are correlated, X^T X is near-singular, causing ordinary least squares coefficients to oscillate to enormous positive and negative values with high test variance.',
    maths: {
      objective: '\\min_w \\|y - X w\\|_2^2 + \\lambda \\|w\\|_2^2',
      updateOrClosedForm: 'w^* = (X^T X + \\lambda I)^{-1} X^T y',
      workedExample:
        'Scalar problem: X = [2.0]^T, y = [6.0]. OLS estimate is w = 6.0/2.0 = 3.0. Adding L2 penalty \\lambda = 1.0: w^* = (2.0^2 + 1.0)^{-1}(2.0 \\times 6.0) = \\frac{12.0}{5.0} = 2.4. The coefficient shrinks from 3.0 to 2.4 by shrinkage ratio \\frac{4}{4+1} = 0.8, trading small bias for lower prediction variance.',
    },
    evaluationMetrics:
      'Root Mean Squared Error (RMSE) on cross-validation folds, condition number of the regularized matrix (X^T X + \\lambda I), and effective degrees of freedom trace(X(X^T X + \\lambda I)^{-1}X^T).',
    applications: [
      'Spectroscopic chemical concentration estimation across collinear wavelengths',
      'Econometric modeling with inter-correlated macroeconomic indicators',
      'Pre-processing step for linear models when feature count exceeds sample count',
    ],
    source: {
      label: 'Hoerl and Kennard (1970), Ridge Regression: Biased Estimation for Nonorthogonal Problems',
      url: 'https://doi.org/10.1080/00401706.1970.10488634',
      year: 1970,
    },
    learnPath: '/docs/machine-learning/ridge-regression',
  },
  {
    id: 'gmm-em',
    name: 'GMM + EM',
    year: 1977,
    era: 'statistical-expansion',
    category: 'clustering',
    diagram: 'gmm-em',
    reusedVisual: true,
    cameBefore: 'Hard Voronoi assignments in k-means ignoring cluster variance and covariance orientation',
    ledTo: 'Variational autoencoders, hidden Markov models, and soft density estimation',
    problem:
      'Gaussian Mixture Models represent a distribution as a weighted combination of Gaussian components, using the Expectation-Maximization (EM) algorithm to iteratively infer soft assignments and update parameters.',
    previousLimit:
      'k-Means assumes spherical clusters of equal size, creating severe errors when real clusters are elongated, overlapping, or have different variances.',
    maths: {
      objective: '\\max_{\\{\\pi_k, \\mu_k, \\Sigma_k\\}} \\sum_{i=1}^n \\ln \\left( \\sum_{k=1}^K \\pi_k \\mathcal{N}(x_i \\mid \\mu_k, \\Sigma_k) \\right)',
      updateOrClosedForm: '\\gamma_{i,k} = \\frac{\\pi_k \\mathcal{N}(x_i \\mid \\mu_k, \\Sigma_k)}{\\sum_j \\pi_j \\mathcal{N}(x_i \\mid \\mu_j, \\Sigma_j)}, \\quad \\mu_k = \\frac{\\sum_i \\gamma_{i,k} x_i}{\\sum_i \\gamma_{i,k}}',
      workedExample:
        'Point x = 4.0. Two 1D components: C_1(\\mu_1=2.0, \\sigma^2=1.0, \\pi_1=0.5), C_2(\\mu_2=5.0, \\sigma^2=1.0, \\pi_2=0.5). Densities: \\mathcal{N}(4; 2, 1) = 0.0540, \\mathcal{N}(4; 5, 1) = 0.2419. Responsibility \\gamma(z_2) = \\frac{0.5(0.2419)}{0.5(0.0540) + 0.5(0.2419)} = \\frac{0.1210}{0.1479} = 0.818. Point x has 81.8% responsibility in cluster 2.',
    },
    evaluationMetrics:
      'Log-likelihood on held-out test data, Akaike Information Criterion (AIC), and Bayesian Information Criterion (BIC) to penalize component count.',
    applications: [
      'Acoustic phone modeling in automatic speech recognition systems',
      'Background subtraction and motion detection in computer vision streams',
      'Unsupervised anomaly detection based on low mixture density thresholds',
    ],
    source: {
      label: 'Dempster, Laird, and Rubin (1977), Maximum Likelihood from Incomplete Data via the EM Algorithm',
      url: 'https://doi.org/10.1111/j.2517-6161.1977.tb01600.x',
      year: 1977,
    },
    learnPath: '/docs/machine-learning/gmm-spectral-clustering',
  },
  {
    id: 'decision-trees',
    name: 'Decision Trees (ID3 / CART)',
    year: 1984,
    era: 'statistical-expansion',
    category: 'trees-ensembles',
    diagram: 'decision-trees',
    reusedVisual: true,
    cameBefore: 'Linear hyperplanes unable to express non-linear feature interactions without manual polynomial expansion',
    ledTo: 'Random forests, gradient boosting, and rule-based interpretable systems',
    problem:
      'Decision trees partition feature space into axis-aligned rectangular regions by recursively choosing splits that maximize impurity reduction (Gini impurity or information gain).',
    previousLimit:
      'Linear models require humans to hypothesize interaction terms (e.g. x1 * x2) manually; failing to do so leaves non-linear threshold logic completely undetected.',
    maths: {
      objective: '\\max_{j, s} \\Delta I = I(D) - \\left( \\frac{|D_L|}{|D|} I(D_L) + \\frac{|D_R|}{|D|} I(D_R) \\right)',
      updateOrClosedForm: 'I_{\\text{Gini}}(D) = 1 - \\sum_{c=1}^C p_c^2, \\quad I_{\\text{Entropy}}(D) = -\\sum_{c=1}^C p_c \\log_2 p_c',
      workedExample:
        'Parent node has 6 positive and 4 negative instances (N=10). Parent Gini = 1 - (0.6^2 + 0.4^2) = 0.48. Split at x_1 \\le 3: Left child has 5 positive and 0 negative (Gini = 0); Right child has 1 positive and 4 negative (Gini = 1 - (0.2^2 + 0.8^2) = 0.32). Weighted child impurity is 0.5(0) + 0.5(0.32) = 0.16. Gini gain \\Delta = 0.48 - 0.16 = 0.32.',
    },
    evaluationMetrics:
      'Accuracy, tree depth, leaf count, cost-complexity pruning path (\alpha penalty), and Mean Squared Error for regression trees.',
    applications: [
      'Clinical diagnosis decision rules in emergency medical protocols',
      'Credit underwriting rules requiring auditable human explanations',
      'Defect classification on semiconductor fabrication test lines',
    ],
    source: {
      label: 'Breiman, Friedman, Olshen, and Stone (1984), Classification and Regression Trees',
      url: 'https://doi.org/10.1201/9781315139470',
      year: 1984,
    },
    learnPath: '/docs/machine-learning/decision-tree',
  },
  {
    id: 'svm',
    name: 'Support Vector Machines (SVM)',
    year: 1995,
    era: 'margins-sparsity-ensembles',
    category: 'classification',
    diagram: 'svm',
    reusedVisual: true,
    cameBefore: 'Perceptrons settling arbitrarily on any valid separating boundary with zero margin',
    ledTo: 'Kernel methods, support vector regression, and maximum-margin Markov networks',
    problem:
      'Support Vector Machines find the hyperplane that maximizes the geometric margin between classes, using kernel functions to implicitly map inputs into infinite-dimensional spaces without computing coordinates directly.',
    previousLimit:
      'The original perceptron finds any separating line that happens to halt learning, often skimming millimeters away from training examples and generalizing poorly to test noise.',
    maths: {
      objective: '\\min_{w, b} \\frac{1}{2} \\|w\\|_2^2 + C \\sum_{i=1}^n \\xi_i \\quad \\text{subject to } y_i(w^T \\phi(x_i) + b) \\ge 1 - \\xi_i',
      updateOrClosedForm: 'f(x) = \\mathrm{sign}\\left( \\sum_{i \\in SV} \\alpha_i y_i K(x_i, x) + b \\right), \\quad K(x_i, x_j) = \\exp(-\\gamma \\|x_i - x_j\\|^2)',
      workedExample:
        'In 1D: point x_1 = 1.0 (y_1 = -1), point x_2 = 3.0 (y_2 = +1). Support vector equations: w(1.0) + b = -1 and w(3.0) + b = +1. Subtracting gives 2w = 2 \\implies w = 1.0. Solving for intercept gives b = -2.0. Decision boundary sits at x = 2.0. Margin width \\gamma = \\frac{2}{\\|w\\|} = \\frac{2}{1.0} = 2.0.',
    },
    evaluationMetrics:
      'Hinge loss, ROC-AUC, support vector ratio (fraction of dataset stored as support vectors), and classification accuracy.',
    applications: [
      'Splice-site and protein fold classification in bioinformatics',
      'Handwritten digit recognition on the postal benchmark dataset',
      'Text categorization and document routing across legal taxonomies',
    ],
    source: {
      label: 'Cortes and Vapnik (1995), Support-Vector Networks',
      url: 'https://doi.org/10.1007/BF00994018',
      year: 1995,
    },
    learnPath: '/docs/machine-learning/support-vector-machines',
  },
  {
    id: 'lasso',
    name: 'Lasso (L1 Regularization)',
    year: 1996,
    era: 'margins-sparsity-ensembles',
    category: 'regression',
    diagram: 'lasso',
    reusedVisual: false,
    cameBefore: 'Ridge regression shrinking all coefficients continuously without setting any to exact zero',
    ledTo: 'Elastic net, compressed sensing, group Lasso, and sparse modeling',
    problem:
      'Lasso minimizes squared residuals subject to an L1 penalty on coefficient magnitudes, driving non-informative coefficients to exact zero to perform automatic variable selection.',
    previousLimit:
      'Ridge regression shrinks weights but retains every single variable in the model; practitioners with thousands of noisy features could not obtain sparse, interpretable models.',
    maths: {
      objective: '\\min_w \\frac{1}{2n} \\|y - X w\\|_2^2 + \\lambda \\sum_{j=1}^d |w_j|',
      updateOrClosedForm: 'w_j^* = S(z_j, \\lambda) = \\mathrm{sign}(z_j) \\max(0, |z_j| - \\lambda) \\quad (\\text{Soft-thresholding})',
      workedExample:
        'Single orthogonal feature with unpenalized OLS correlation z = 4.0. With penalty \\lambda = 1.5: w^* = \\mathrm{sign}(4.0) \\max(0, 4.0 - 1.5) = 2.5. If penalty is increased to \\lambda = 5.0: |z| = 4.0 \\le 5.0 \\implies w^* = 0. The coefficient is eliminated from the model.',
    },
    evaluationMetrics:
      'Sparsity ratio (fraction of zero weights), validation RMSE, and cross-validated lambda regularization paths.',
    applications: [
      'Genome-wide association studies (GWAS) identifying sparse causative mutations',
      'Compressed sensing in magnetic resonance imaging reconstruction',
      'High-dimensional financial factor modeling with thousands of technical indicators',
    ],
    source: {
      label: 'Tibshirani (1996), Regression Shrinkage and Selection via the Lasso',
      url: 'https://doi.org/10.1111/j.2517-6161.1996.tb02080.x',
      year: 1996,
    },
    learnPath: '/docs/machine-learning/lasso-regression',
  },
  {
    id: 'dbscan-hdbscan',
    name: 'DBSCAN / HDBSCAN',
    year: 1996,
    era: 'margins-sparsity-ensembles',
    category: 'clustering',
    diagram: 'dbscan-hdbscan',
    reusedVisual: true,
    cameBefore: 'Distance-based clustering assuming convex spherical clusters and assigning every outlier to a group',
    ledTo: 'OPTICS, HDBSCAN (hierarchical density extraction), and spatial noise filtering',
    problem:
      'DBSCAN identifies clusters as contiguous regions of high point density separated by low-density noise, discovering arbitrary non-convex geometries and isolating outliers.',
    previousLimit:
      'k-Means and Gaussian mixtures assume convex shapes and assign every single anomaly to whichever cluster center happens to be closest, corrupting cluster definitions.',
    maths: {
      objective: 'N_\\varepsilon(p) = \\{q \\in D \\mid \\mathrm{dist}(p, q) \\le \\varepsilon\\}',
      updateOrClosedForm: '\\text{Core: } |N_\\varepsilon(p)| \\ge \\text{MinPts}; \\quad \\text{Border: } |N_\\varepsilon(p)| < \\text{MinPts} \\land p \\in N_\\varepsilon(\\text{Core})',
      workedExample:
        'Parameters \\varepsilon = 1.5, \\text{MinPts} = 3. Points: p_1(1, 1), p_2(1, 2), p_3(2, 1), p_4(6, 6). Distances from p_1: d(p_1, p_2) = 1.0 \\le 1.5; d(p_1, p_3) = 1.0 \\le 1.5; d(p_1, p_4) = \\sqrt{5^2+5^2} = 7.07. Point p_1 has neighborhood size 3 \\ge 3, making p_1 a core point. Points p_2 and p_3 are density-reachable. Point p_4 has no neighbors within 1.5 and is labeled noise (-1).',
    },
    evaluationMetrics:
      'DBCV (Density-Based Clustering Validation, from -1 to +1), Adjusted Rand Index (ARI) against ground truth, and percentage of points marked as noise.',
    applications: [
      'Detecting anomalous GPS tracking trajectories in maritime shipping routes',
      'Grouping astronomical stars and galaxies from telescope spatial coordinates',
      'Geographic spatial hotspot discovery for urban transit planning',
    ],
    source: {
      label: 'Ester, Kriegel, Sander, and Xu (1996), A Density-Based Algorithm for Discovering Clusters',
      url: 'https://dl.acm.org/doi/10.5555/3001460.3001507',
      year: 1996,
    },
    learnPath: '/docs/machine-learning/dbscan-hdbscan',
  },
  {
    id: 'adaboost-gbm',
    name: 'AdaBoost / Gradient Boosting',
    year: 1997,
    era: 'margins-sparsity-ensembles',
    category: 'trees-ensembles',
    diagram: 'adaboost-gbm',
    reusedVisual: true,
    cameBefore: 'Single weak decision stumps with high bias and poor predictive accuracy',
    ledTo: 'XGBoost, LightGBM, CatBoost, and functional gradient descent in arbitrary loss spaces',
    problem:
      'Boosting combines an ensemble of weak base learners sequentially, where each new learner corrects the specific errors and residual gradients made by previous learners.',
    previousLimit:
      'Training a single deep model often leads to extreme overfitting or high bias, while bagging (parallel voting) only reduces variance without reducing base learner bias.',
    maths: {
      objective: 'F_m(x) = F_{m-1}(x) + \\gamma_m h_m(x)',
      updateOrClosedForm: 'r_{i,m} = -\\left[ \\frac{\\partial L(y_i, F(x_i))}{\\partial F(x_i)} \\right]_{F=F_{m-1}} \\quad (\\text{Pseudo-residuals})',
      workedExample:
        'Three points with initial weights w = [1/3, 1/3, 1/3]. A weak stump misclassifies point 1 (error \\epsilon = 0.333). Learner weight \\alpha = \\frac{1}{2} \\ln((1 - 0.333)/0.333) = \\frac{1}{2} \\ln(2.0) = 0.347. Updated weight for error point: w_1 \\leftarrow \\frac{1}{3} e^{0.347} = 0.471. Correct points: w_2, w_3 \\leftarrow \\frac{1}{3} e^{-0.347} = 0.235. Renormalized weights focus the next tree on the missed point.',
    },
    evaluationMetrics:
      'Exponential loss for AdaBoost, deviance / negative log-likelihood for GBM, early stopping validation loss, and feature importance rankings.',
    applications: [
      'Viola-Jones real-time face detection cascade in early digital cameras',
      'Predicting tabular click-through rates and customer conversion pipelines',
      'Credit risk and insurance loss frequency actuarial modeling',
    ],
    source: {
      label: 'Freund and Schapire (1997), A Decision-Theoretic Generalization of On-Line Learning',
      url: 'https://doi.org/10.1006/jcss.1997.1504',
      year: 1997,
    },
    learnPath: '/docs/machine-learning/boosting',
  },
  {
    id: 'spectral-clustering',
    name: 'Spectral Clustering',
    year: 2000,
    era: 'margins-sparsity-ensembles',
    category: 'clustering',
    diagram: 'spectral-clustering',
    reusedVisual: false,
    cameBefore: 'Standard geometric clustering failing on concentric circles and connected graph manifolds',
    ledTo: 'Graph convolutional networks, Laplacian eigenmaps, and normalized graph cuts',
    problem:
      'Spectral clustering projects data into the eigenspace of a graph Laplacian matrix before clustering with k-means, separating complex non-linear geometries through connectivity rather than raw coordinate distance.',
    previousLimit:
      'k-Means and Gaussian mixture models separate data using straight hyperplanes or ellipsoids, failing on concentric rings or entangled spirals where points belong together by continuous paths.',
    maths: {
      objective: '\\min_{A_1,\\dots,A_k} \\sum_{j=1}^k \\frac{\\mathrm{cut}(A_j, \\bar{A}_j)}{\\mathrm{vol}(A_j)} \\quad (\\text{Normalized Cut})',
      updateOrClosedForm: 'L_{\\text{sym}} = I - D^{-1/2} W D^{-1/2}, \\quad L v = \\lambda v',
      workedExample:
        'Two tightly knit communities {1, 2} and {3, 4} connected by a single sparse bridge edge (2, 3). Unnormalized graph Laplacian L = D - W has trivial first eigenvector v_1 = [1, 1, 1, 1]^T (\\lambda_1 = 0). The second eigenvector (Fiedler vector) is v_2 \\approx [-0.707, -0.408, 0.408, 0.707]^T. Nodes 1 and 2 have negative signs while 3 and 4 have positive signs; thresholding at 0 cleanly isolates the two graph clusters.',
    },
    evaluationMetrics:
      'Normalized Cut cost, modularity score on graph partitions, and eigengap \\lambda_{k+1} - \\lambda_k to select optimal cluster count k.',
    applications: [
      'Image segmentation partitioning visual scenes into coherent objects',
      'Community detection in social graphs and citation networks',
      'Circuit layout partitioning to minimize wiring across semiconductor blocks',
    ],
    source: {
      label: 'Shi and Malik (2000), Normalized Cuts and Image Segmentation',
      url: 'https://doi.org/10.1109/34.868688',
      year: 2000,
    },
    learnPath: '/docs/machine-learning/gmm-spectral-clustering',
  },
  {
    id: 'random-forest',
    name: 'Random Forest',
    year: 2001,
    era: 'margins-sparsity-ensembles',
    category: 'trees-ensembles',
    diagram: 'random-forest',
    reusedVisual: true,
    cameBefore: 'Single decision trees suffering high variance and sensitivity to small data perturbations',
    ledTo: 'Extremely Randomized Trees (Extra-Trees), Isolation Forests, and ensemble stacking',
    problem:
      'Random Forests construct a large collection of de-correlated decision trees using bootstrap aggregating (bagging) and random feature subsets at every split, averaging outputs to eliminate variance without increasing bias.',
    previousLimit:
      'Bagging regular decision trees produces trees that look very similar because the single strongest feature is chosen at the root of every tree, limiting the correlation reduction benefit.',
    maths: {
      objective: '\\mathrm{Var}(\\bar{f}) = \\rho \\sigma^2 + \\frac{1 - \\rho}{B} \\sigma^2',
      updateOrClosedForm: 'm = \\lfloor \\sqrt{d} \\rfloor \\quad (\\text{classification}), \\quad m = \\lfloor d / 3 \\rfloor \\quad (\\text{regression})',
      workedExample:
        'Suppose individual trees have error variance \\sigma^2 = 9.0 and pairwise tree prediction correlation \\rho = 0.20. With an ensemble of B = 100 trees, total ensemble variance is \\mathrm{Var} = 0.20(9.0) + \\frac{1 - 0.20}{100}(9.0) = 1.80 + 0.072 = 1.872. Random feature selection reduces correlation from 0.8 to 0.2, lowering error variance by almost 5×.',
    },
    evaluationMetrics:
      'Out-Of-Bag (OOB) error (unbiased validation score computed without a separate test set), Permutation Feature Importance, and Mean Decrease in Impurity (MDI).',
    applications: [
      'Real-time body part recognition in Microsoft Kinect depth cameras',
      'Default prediction and underwriting scoring on tabular financial records',
      'Biomarker gene discovery identifying disease drivers from microarray panels',
    ],
    source: {
      label: 'Breiman (2001), Random Forests',
      url: 'https://doi.org/10.1023/A:1010933404324',
      year: 2001,
    },
    learnPath: '/docs/machine-learning/random-forest',
  },
  {
    id: 'conformal-prediction',
    name: 'Conformal Prediction',
    year: 2005,
    era: 'modern-guarantees-scale',
    category: 'uncertainty-anomaly',
    diagram: 'conformal-prediction',
    reusedVisual: true,
    cameBefore: 'Overconfident heuristic point predictions and fragile parametric distribution assumptions',
    ledTo: 'Conformalized quantile regression, risk-controlling prediction sets, and LLM hallucination bounds',
    problem:
      'Conformal prediction wraps any machine learning model to output prediction intervals or sets with mathematically proven finite-sample coverage guarantees without distribution assumptions.',
    previousLimit:
      'Models output single numbers or overconfident softmax scores that offer no rigorous confidence bounds, leaving downstream operators unaware of predictive uncertainty.',
    maths: {
      objective: 'P(Y_{n+1} \\in C(X_{n+1})) \\ge 1 - \\alpha \\quad (\\text{Finite-sample guarantee})',
      updateOrClosedForm: 'q = \\text{Quantile}\\left( \\frac{\\lceil (n+1)(1-\\alpha) \\rceil}{n}, \\; \\{s_i\\}_{i=1}^n \\right), \\quad C(x) = [\\hat{y}(x) - q, \\; \\hat{y}(x) + q]',
      workedExample:
        'Calibration set of n = 99 residuals |y_i - \\hat{y}_i|. Desired coverage 90% (\\alpha = 0.10). Rank index is p = \\lceil (99 + 1)(1 - 0.10) \\rceil = \\lceil 100 \\times 0.90 \\rceil = 90. We sort the 99 residuals and read the 90th value, say q = 3.2. For a new test point with prediction \\hat{y} = 25.0, the guaranteed 90% prediction interval is [25.0 - 3.2, 25.0 + 3.2] = [21.8, 28.2].',
    },
    evaluationMetrics:
      'Empirical coverage rate (must be \\ge 1 - \\alpha on test data) and average set size or interval width (measuring statistical efficiency).',
    applications: [
      'Safety-critical medical dosing bounds where missing the true target has severe clinical cost',
      'Autonomous vehicle trajectory tolerance bounds under changing road conditions',
      'Calibrated classification sets for high-stakes insurance claims triage',
    ],
    source: {
      label: 'Vovk, Gammerman, and Shafer (2005), Algorithmic Learning in a Random World',
      url: 'https://doi.org/10.1007/b106715',
      year: 2005,
    },
    learnPath: '/docs/machine-learning/uncertainty-estimation-and-conformal-prediction',
  },
  {
    id: 'elastic-net',
    name: 'Elastic Net',
    year: 2005,
    era: 'modern-guarantees-scale',
    category: 'regression',
    diagram: 'elastic-net',
    reusedVisual: false,
    cameBefore: 'Lasso arbitrarily picking one feature from a group of correlated predictors and dropping the rest',
    ledTo: 'Sparse group Lasso, regularized Cox survival models, and high-dimensional genomics regression',
    problem:
      'Elastic Net combines L1 (Lasso) and L2 (Ridge) penalties to select groups of correlated features simultaneously while preserving sparsity and numerical stability.',
    previousLimit:
      'When several predictors are strongly correlated, Lasso arbitrarily retains one and zeros out the others, which is unstable under small data perturbations and discards correlated biological pathways.',
    maths: {
      objective: '\\min_w \\|y - X w\\|_2^2 + \\lambda_1 \\|w\\|_1 + \\lambda_2 \\|w\\|_2^2',
      updateOrClosedForm: '\\hat{w}_j = \\frac{S(X_j^T (y - X_{-j} w_{-j}), \\; \\lambda_1)}{1 + \\lambda_2}',
      workedExample:
        'Two strongly correlated features x_1 and x_2 (r=0.98). Target y. OLS has ill-conditioned matrix inversion; Lasso arbitrarily drops one feature. Elastic Net with \\lambda_1 = 0.5, \\lambda_2 = 1.0 adds strict convexity from \\lambda_2, forcing the coefficients to share weight equally (e.g. w_1 = 1.15, w_2 = 1.10) while zeroing out unrelated noise variables.',
    },
    evaluationMetrics:
      'Mean Squared Error on cross-validation folds, number of selected non-zero feature groups, and coefficient path stability.',
    applications: [
      'Microarray gene expression modeling with shared biological gene pathways',
      'Portfolio asset factor weighting across correlated equities',
      'Chemometric sensor arrays where adjacent sensors measure overlapping signals',
    ],
    source: {
      label: 'Zou and Hastie (2005), Regularization and Variable Selection via the Elastic Net',
      url: 'https://doi.org/10.1111/j.1467-9868.2005.00503.x',
      year: 2005,
    },
    learnPath: '/docs/machine-learning/elastic-net',
  },
  {
    id: 'tsne-umap',
    name: 't-SNE / UMAP',
    year: 2008,
    era: 'modern-guarantees-scale',
    category: 'dimensionality-reduction',
    diagram: 'tsne-umap',
    reusedVisual: false,
    cameBefore: 'Linear PCA projecting curved, high-dimensional manifolds onto overlapping planes',
    ledTo: 'Parametric UMAP, single-cell RNA velocity visualization, and embedding exploration tools',
    problem:
      't-SNE and UMAP convert pairwise high-dimensional distances into probabilities or fuzzy topological complexes, optimizing 2D coordinates to reveal non-linear cluster structure and manifold geometry.',
    previousLimit:
      'Linear methods like PCA project curved manifolds onto flat planes, causing distinct clusters that exist on different folds of space to collapse directly on top of each other in the 2D visualization.',
    maths: {
      objective: 'KL(P \\parallel Q) = \\sum_{i \\neq j} p_{ij} \\ln \\frac{p_{ij}}{q_{ij}}',
      updateOrClosedForm: 'q_{ij} = \\frac{(1 + \\|y_i - y_j\\|_2^2)^{-1}}{\\sum_k \\sum_{l \\neq k} (1 + \\|y_k - y_l\\|_2^2)^{-1}} \\quad (\\text{Student-t heavy tail})',
      workedExample:
        'In high dimensions, distance d=2.0 between two points yields joint probability p_{ij} = 0.05. In 2D, the Student-t kernel q_{ij} \\propto (1 + d^2)^{-1} has much heavier tails than a Gaussian. To achieve equal probability, the 2D distance must push out to d_{2D} = 4.36, resolving the "crowding problem" and opening visible white space between clusters.',
    },
    evaluationMetrics:
      'Trustworthiness and continuity metrics (quantifying whether nearest neighbors in high-D remain neighbors in 2D), and Shepard diagram correlation.',
    applications: [
      'Single-cell transcriptomics cell-type discovery across thousands of genes',
      'Inspecting neural network activation and latent token embeddings',
      'Visualizing malware behavioral execution clusters in cybersecurity',
    ],
    source: {
      label: 'van der Maaten and Hinton (2008), Visualizing Data using t-SNE',
      url: 'https://www.jmlr.org/papers/v9/vandermaaten08a.html',
      year: 2008,
    },
    learnPath: '/docs/machine-learning/ica-tsne-umap',
  },
  {
    id: 'isolation-forest',
    name: 'Isolation Forest',
    year: 2008,
    era: 'modern-guarantees-scale',
    category: 'uncertainty-anomaly',
    diagram: 'isolation-forest',
    reusedVisual: true,
    cameBefore: 'Density and distance methods calculating expensive O(n²) all-pairs comparisons to find outliers',
    ledTo: 'Extended Isolation Forest, streaming anomaly detectors, and production monitoring guards',
    problem:
      'Isolation Forest detects anomalies by isolating points through random recursive feature cuts, exploiting the fact that outliers are few and different and therefore require fewer splits to isolate.',
    previousLimit:
      'Traditional anomaly detectors construct normal profiles using density or distance calculations that scale quadratically O(n²), making them impractical for large datasets.',
    maths: {
      objective: 's(x, n) = 2^{-\\frac{E(h(x))}{c(n)}} \\quad (\\text{Anomaly score})',
      updateOrClosedForm: 'c(n) = 2(\\ln(n - 1) + 0.5772156649) - \\frac{2(n - 1)}{n}',
      workedExample:
        'Dataset size n = 256, average tree path length for normal points c(256) \\approx 9.2 splits. An extreme fraud outlier is isolated on the very first random cut: path length h(x) = 1. Anomaly score s = 2^{-1 / 9.2} = 2^{-0.108} = 0.927. Scores near 1.0 flag definite anomalies, whereas normal points near path length 9.2 yield score 2^{-1} = 0.50.',
    },
    evaluationMetrics:
      'Precision at k (P@k), ROC-AUC on labeled fraud benchmarks, inference latency per record, and false alarm rate at operational thresholds.',
    applications: [
      'Credit card transaction fraud scoring at merchant payment gateways',
      'Industrial sensor failure warning detection on high-speed turbines',
      'Network intrusion detection flagging aberrant server packet flows',
    ],
    source: {
      label: 'Liu, Ting, and Zhou (2008), Isolation Forest',
      url: 'https://doi.org/10.1109/ICDM.2008.17',
      year: 2008,
    },
    learnPath: '/docs/machine-learning/anomaly-detection',
  },
  {
    id: 'xgboost-lightgbm-catboost',
    name: 'XGBoost / LightGBM / CatBoost',
    year: 2016,
    era: 'modern-guarantees-scale',
    category: 'trees-ensembles',
    diagram: 'xgboost-lightgbm-catboost',
    reusedVisual: true,
    cameBefore: 'First-order gradient boosting needing exhaustive greedy feature scans across continuous values',
    ledTo: 'Modern production tabular ML pipelines, GPU tree building, and competitive Kaggle benchmarks',
    problem:
      'Modern gradient boosted tree frameworks incorporate second-order Taylor loss expansions, histogram-based split binning, categorical encoding, and leaf-wise tree growth to accelerate training by orders of magnitude.',
    previousLimit:
      'Classic gradient boosting relies only on first-order gradients, examines every continuous split point exhaustively, and handles categorical features through naive one-hot expansion.',
    maths: {
      objective: '\\mathcal{L}^{(t)} \\approx \\sum_{i=1}^n \\left[ g_i f_t(x_i) + \\frac{1}{2} h_i f_t(x_i)^2 \\right] + \\gamma T + \\frac{1}{2} \\lambda \\sum_{j=1}^T w_j^2',
      updateOrClosedForm: 'w_j^* = -\\frac{\\sum_{i \\in I_j} g_i}{\\sum_{i \\in I_j} h_i + \\lambda}, \\quad \\text{Gain} = \\frac{1}{2} \\left[ \\frac{G_L^2}{H_L + \\lambda} + \\frac{G_R^2}{H_R + \\lambda} - \\frac{(G_L + G_R)^2}{H_L + H_R + \\lambda} \\right] - \\gamma',
      workedExample:
        'Split evaluation with L2 penalty \\lambda = 1.0, complexity cost \\gamma = 0. Left child gradients G_L = -4.0, Hessians H_L = 2.0; Right child G_R = 6.0, H_R = 3.0. Combined G = 2.0, H = 5.0. Score = \\frac{1}{2}\\left( \\frac{(-4)^2}{2+1} + \\frac{6^2}{3+1} - \\frac{2^2}{5+1} \\right) = \\frac{1}{2}(5.333 + 9.000 - 0.667) = 6.833. The positive gain indicates the split should be taken.',
    },
    evaluationMetrics:
      'Validation log-loss / RMSE, early stopping iteration index, learning rate shrinkage schedules, and SHAP feature attribution values.',
    applications: [
      'Production search ranking and recommendation scoring engines',
      'Credit risk and fraud risk scoring across massive tabular databases',
      'Algorithmic trading signal prediction on limit order book features',
    ],
    source: {
      label: 'Chen and Guestrin (2016), XGBoost: A Scalable Tree Boosting System',
      url: 'https://doi.org/10.1145/2939672.2939785',
      year: 2016,
    },
    learnPath: '/docs/machine-learning/xgboost-lightgbm-catboost',
  },
  {
    id: 'e-means',
    name: 'e-means',
    year: 2026,
    era: 'modern-guarantees-scale',
    category: 'clustering',
    diagram: 'e-means',
    reusedVisual: false,
    cameBefore: 'Lloyd full-batch k-means requiring dozens of full-dataset passes on massive embedding vectors',
    ledTo: 'Billion-scale embedding clustering, scalable vector search index quantization, and fast data curation',
    problem:
      'e-means accelerates k-means clustering by updating cluster running sums and counts across streaming mini-batches using an exponential moving average (EMA) with scaling-law hyperparameters and cosine decay.',
    previousLimit:
      'Standard Lloyd k-means processes the entire dataset on every pass. On billion-scale embedding datasets, 25 full-batch epochs require enormous compute and memory bandwidth, while prior mini-batch heuristics suffered from high distortion.',
    maths: {
      objective: '\\min_{\\{c_j\\}} \\frac{1}{n} \\sum_{i=1}^n \\min_j \\|x_i - c_j\\|_2^2 \\quad (\\text{Standard k-means objective})',
      updateOrClosedForm: 'S_j \\leftarrow (1 - \\alpha) S_j + \\alpha s_j, \\quad N_j \\leftarrow (1 - \\alpha) N_j + \\alpha n_j, \\quad c_j = \\frac{S_j}{N_j}',
      workedExample:
        'Centroid c_1 starts at [0, 0] with running sum S_1 = [0, 0] and count N_1 = 10.0. Current learning rate \\alpha = 0.20. A mini-batch arrives with two points assigned to cluster 1: x_1 = [1, 1], x_2 = [2, 0]. Batch sum s_1 = [3, 1], batch count n_1 = 2. EMA update: S_1 \\leftarrow 0.8[0, 0] + 0.2[3, 1] = [0.6, 0.2]; N_1 \\leftarrow 0.8(10.0) + 0.2(2) = 8.4. Updated centroid c_1 = [0.6, 0.2] / 8.4 = [0.0714, 0.0238]. When batch size B = n and \\alpha = 1, the formula simplifies exactly to Lloyd: c_1 = s_1 / n_1.',
    },
    evaluationMetrics:
      'Test distortion / inertia reached per epoch (matches 25-epoch Lloyd in 1.2–3 epochs), GPU wall-clock speedup (10–45× vs Flash-KMeans), and CPU speedup (8–15× vs Faiss).',
    applications: [
      'Clustering massive 10-billion DINO embedding datasets into 16 million vector centroids',
      'Fast codebook training for Inverted File (IVF) vector search indexes in Faiss',
      'Deduplication and semantic partitioning for large multimodal pretraining corpora',
    ],
    source: {
      label: 'Bessa, Mazaré, Szilvasy, Touvron, Picard, Douze, and Jégou (2026), e-means: outperforming k-means',
      url: 'https://arxiv.org/abs/2611.09501',
      year: 2026,
    },
    learnPath: '/docs/machine-learning/kmeans-hierarchical-clustering',
  },
];
